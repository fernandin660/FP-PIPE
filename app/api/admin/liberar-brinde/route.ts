import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { DEFINICAO_PLANOS, type PlanoChave } from "../../../../lib/planos";

// ============================================================
// Admin — Liberar brinde temporário para uma empresa.
//
// POST /api/admin/liberar-brinde
//   body: { email, plano?, duracaoHoras? }
//     plano (opcional, default "silver"): chave de DEFINICAO_PLANOS
//     duracaoHoras (opcional, default 24): 1..720
//
// Credita as carteiras como o webhook do Mercado Pago faria e marca a
// assinatura com origem "gift" + renova_em. Quando renova_em vencer, o
// acesso volta sozinho para Teste grátis com carteiras zeradas
// (avaliarAcesso reverte inline; o cron reforça).
//
// Acesso restrito ao dono do produto (EMAIL_AVISOS).
// ============================================================

const DUPLICAR_BANDA = { min: 1, max: 720 };

export async function POST(req: Request) {
  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) {
    return NextResponse.json(
      { erro: "Autenticação não configurada." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const emailDono = (
    process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br"
  ).toLowerCase();

  if (!user || (user.email ?? "").toLowerCase() !== emailDono) {
    return NextResponse.json(
      { erro: "Acesso restrito ao dono do produto." },
      { status: 403 }
    );
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Chave de serviço não configurada." },
      { status: 503 }
    );
  }

  let corpo: { email?: string; plano?: string; duracaoHoras?: number };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json(
      { erro: "JSON inválido no corpo." },
      { status: 400 }
    );
  }

  const emailAlvo = (corpo.email ?? "").trim().toLowerCase();
  if (!emailAlvo) {
    return NextResponse.json(
      { erro: "Informe o campo email." },
      { status: 400 }
    );
  }

  const plano = (corpo.plano || "silver") as PlanoChave;
  const definicao = DEFINICAO_PLANOS[plano];
  if (!definicao || plano === "teste") {
    return NextResponse.json(
      { erro: "Plano inválido. Use silver, gold, platinum (+_intl)." },
      { status: 400 }
    );
  }

  let horas = Math.floor(corpo.duracaoHoras ?? 24);
  horas = Math.min(DUPLICAR_BANDA.max, Math.max(DUPLICAR_BANDA.min, horas));

  // 1. Localiza o usuário pelo e-mail
  const { data: listaUsers, error: erroLista } =
    await admin.auth.admin.listUsers();
  if (erroLista) {
    return NextResponse.json(
      { erro: "Falha ao buscar usuário." },
      { status: 500 }
    );
  }
  const alvo = (listaUsers?.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === emailAlvo
  );
  if (!alvo) {
    return NextResponse.json(
      { erro: "Usuário com este e-mail não existe." },
      { status: 404 }
    );
  }

  // 2. Resolve a organização (prefere papel admin, senão a primeira ativa)
  const { data: membros } = await admin
    .from("organizacao_membros")
    .select("organizacao_id, papel")
    .eq("usuario_id", alvo.id)
    .eq("status", "ativo");
  const membroAdmin = (membros ?? []).find((m) => m.papel === "admin");
  const orgId = (membroAdmin ?? membros?.[0])?.organizacao_id;
  if (!orgId) {
    return NextResponse.json(
      { erro: "Usuário não está vinculado a nenhuma organização." },
      { status: 404 }
    );
  }

  const agora = new Date();
  const renovaEm = new Date(agora.getTime() + horas * 3600000);

  // 3. Grava a assinatura como brinde (origem "gift" + término)
  const { error: erroAssinatura } = await admin
    .from("assinaturas")
    .upsert(
      {
        usuario_id: alvo.id,
        organizacao_id: orgId,
        plano,
        status: "ativa",
        ciclo: null,
        origem: "gift",
        mp_preference_id: null,
        mp_payment_id: null,
        inicio: agora.toISOString(),
        renova_em: renovaEm.toISOString(),
        atualizado_em: agora.toISOString(),
      },
      { onConflict: "organizacao_id" }
    );
  if (erroAssinatura) {
    console.error("Erro ao gravar assinatura brinde:", erroAssinatura);
    return NextResponse.json(
      { erro: "Persistência da assinatura falhou." },
      { status: 500 }
    );
  }

  // 4. Carteiras — espelha o webhook do Mercado Pago:
  //    creditos_contatos += buscasMes · creditos += listasMes ·
  //    creditos_ia = creditosAbordagem.
  //    Planos sem buscador (buscasMes nulo) não recebem contatos — zera
  //    eventuais sobras para o brinde ficar "puro".
  if (definicao.buscasMes && definicao.buscasMes > 0) {
    const { data: atual } = await admin
      .from("creditos_contatos")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();
    if (atual) {
      await admin
        .from("creditos_contatos")
        .update({ saldo: atual.saldo + definicao.buscasMes })
        .eq("organizacao_id", orgId);
    } else {
      await admin
        .from("creditos_contatos")
        .insert({ organizacao_id: orgId, saldo: definicao.buscasMes });
    }
  } else {
    await admin
      .from("creditos_contatos")
      .update({ saldo: 0 })
      .eq("organizacao_id", orgId);
  }

  if (definicao.listasMes > 0) {
    const { data: atual } = await admin
      .from("creditos")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();
    if (atual) {
      await admin
        .from("creditos")
        .update({
          saldo: atual.saldo + definicao.listasMes,
          atualizado_em: agora.toISOString(),
        })
        .eq("organizacao_id", orgId);
    } else {
      await admin
        .from("creditos")
        .insert({ organizacao_id: orgId, saldo: definicao.listasMes });
    }
  }

  if (definicao.creditosAbordagem > 0) {
    const { data: atual } = await admin
      .from("creditos_ia")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();
    if (atual) {
      await admin
        .from("creditos_ia")
        .update({
          saldo: definicao.creditosAbordagem,
          atualizado_em: agora.toISOString(),
        })
        .eq("organizacao_id", orgId);
    } else {
      await admin
        .from("creditos_ia")
        .insert({
          usuario_id: alvo.id,
          organizacao_id: orgId,
          saldo: definicao.creditosAbordagem,
          atualizado_em: agora.toISOString(),
        });
    }
  }

  // 5. Retorna o estado final
  const saldos: Record<string, number | null> = {};
  for (const t of ["creditos", "creditos_contatos", "creditos_ia", "creditos_telefone"]) {
    const { data: s } = await admin
      .from(t)
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();
    saldos[t] = s?.saldo ?? null;
  }

  return NextResponse.json({
    ok: true,
    email: alvo.email,
    orgId,
    plano,
    duracaoHoras: horas,
    renova_em: renovaEm.toISOString(),
    saldos,
    revert: "Ao expirar, volta para Teste grátis com carteiras zeradas.",
  });
}

// Lista brindes ativos (origem "gift")
export async function GET() {
  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) {
    return NextResponse.json(
      { erro: "Autenticação não configurada." },
      { status: 503 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const emailDono = (
    process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br"
  ).toLowerCase();
  if (!user || (user.email ?? "").toLowerCase() !== emailDono) {
    return NextResponse.json(
      { erro: "Acesso restrito ao dono do produto." },
      { status: 403 }
    );
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Chave de serviço não configurada." },
      { status: 503 }
    );
  }

  const { data: brindes, error } = await admin
    .from("assinaturas")
    .select("organizacao_id, plano, status, renova_em, atualizado_em")
    .eq("origem", "gift")
    .eq("status", "ativa")
    .gt("renova_em", new Date().toISOString());

  if (error) {
    return NextResponse.json(
      { erro: "Consulta falhou." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, brindes: brindes ?? [] });
}