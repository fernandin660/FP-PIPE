import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { verificarCreditosBaixos } from "../../../lib/avisos";

// Desbloqueio REAL de contato: debita 1 crédito de lead e marca
// a empresa como desbloqueada (companies.contato_desbloqueado_em).
// Só leads marcados assim podem entrar em listas salvas.
export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) {
    return gate.resposta;
  }
  const { orgId, usuarioId } = gate.ctx!;

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço de créditos indisponível." },
      { status: 503 }
    );
  }

  let corpo: { cnpj?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const cnpj =
    typeof corpo.cnpj === "string" ? corpo.cnpj.replace(/\D/g, "") : "";
  if (cnpj.length !== 14) {
    return NextResponse.json({ erro: "CNPJ inválido." }, { status: 400 });
  }

  // ============================================================
  // Localização da empresa
  // ============================================================
  // A empresa pode estar salva sob a organização atual OU sob a linha
  // legada do próprio usuário (antes da migração por equipe). Busca
  // nas duas e usa a mais recente - evita "lead não encontrado".
  const { data: empOrg } = await admin
    .from("companies")
    .select("id, contato_desbloqueado_em, criado_em")
    .eq("organizacao_id", orgId)
    .eq("cnpj", cnpj)
    .not("criado_em", "is", null)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  let empresa = empOrg;

  if (!empresa) {
    const { data: empUsuario } = await admin
      .from("companies")
      .select("id, contato_desbloqueado_em, criado_em")
      .eq("usuario_id", usuarioId)
      .eq("cnpj", cnpj)
      .not("criado_em", "is", null)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    empresa = empUsuario;
  }

  if (!empresa) {
    return NextResponse.json(
      { erro: "Lead não encontrado na sua conta." },
      { status: 404 }
    );
  }

  // Já desbloqueado antes: não cobra de novo.
  if (empresa.contato_desbloqueado_em) {
    return NextResponse.json({ ok: true, jaDesbloqueado: true });
  }

  // ============================================================
  // Localização dos créditos de lead
  // ============================================================
  // A tela mostra o saldo (ex.: 1294) que pode estar em uma linha da
  // organização ou em uma linha antiga do usuário com outra org.
  // Junta TODAS as candidatas e escolhe a com maior saldo disponível.
  const [orgCreditos, userCreditos] = await Promise.all([
    admin
      .from("creditos_contatos")
      .select("id, usuario_id, organizacao_id, saldo")
      .eq("organizacao_id", orgId)
      .order("saldo", { ascending: false })
      .then((r) => r.data ?? []),
    admin
      .from("creditos_contatos")
      .select("id, usuario_id, organizacao_id, saldo")
      .eq("usuario_id", usuarioId)
      .order("saldo", { ascending: false })
      .then((r) => r.data ?? []),
  ]);

  const candidatas = Array.from(
    new Map(
      [...orgCreditos, ...userCreditos].map((c) => [c.id, c])
    ).values()
  ).sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));

  const melhorCredito = candidatas[0] ?? null;

  let creditoFinal = melhorCredito;

  if (!creditoFinal || (creditoFinal.saldo ?? 0) <= 0) {
    // Se a única linha com saldo é a antiga do usuário (outra org),
    // realinha para a organização atual antes de debitar.
    const legado = userCreditos?.find((c) => (c.saldo ?? 0) > 0);

    if (legado) {
      const { data: migrado } = await admin
        .from("creditos_contatos")
        .update({ organizacao_id: orgId })
        .eq("id", legado.id)
        .select("id, usuario_id, organizacao_id, saldo")
        .single();
      creditoFinal = migrado ?? legado;
    }
  }

  const saldoAtual = creditoFinal?.saldo ?? 0;

  if (!creditoFinal || saldoAtual <= 0) {
    return NextResponse.json(
      {
        erro: `O servidor não encontrou crédito de lead disponível (saldo: ${saldoAtual}).`,
        motivo: "limite_creditos",
        saldoServidor: saldoAtual,
      },
      { status: 403 }
    );
  }

  const agora = new Date().toISOString();

  // ============================================================
  // Débito atômico: uma única query que só debita se saldo > 0.
  // ============================================================
  const { data: novoSaldo } = await admin
    .from("creditos_contatos")
    .update({
      saldo: saldoAtual - 1,
      atualizado_em: agora,
    })
    .eq("id", creditoFinal.id)
    .gt("saldo", 0)
    .select("saldo")
    .maybeSingle();

  if (!novoSaldo) {
    return NextResponse.json(
      {
        erro: `O servidor identificou ${saldoAtual} crédito(s) de lead disponíveis, mas o saldo mudou durante a operação. Recarregue a página e tente novamente.`,
        motivo: "limite_creditos",
        saldoServidor: saldoAtual,
      },
      { status: 403 }
    );
  }

  // Marca o lead como desbloqueado (só após débito confirmado)
  const { error: erroMarca } = await admin
    .from("companies")
    .update({ contato_desbloqueado_em: agora })
    .eq("id", empresa.id);

  if (erroMarca) {
    // Reverte o débito se falhar ao marcar
    await admin
      .from("creditos_contatos")
      .update({ saldo: saldoAtual, atualizado_em: agora })
      .eq("id", creditoFinal.id);

    return NextResponse.json(
      {
        erro:
          "Não conseguimos registrar o desbloqueio. Tente novamente.",
      },
      { status: 500 }
    );
  }

  // Alerta assíncrono: não bloqueia a resposta
  void verificarCreditosBaixos(orgId);

  return NextResponse.json({
    ok: true,
    jaDesbloqueado: false,
    novoSaldo: novoSaldo.saldo,
  });
}
