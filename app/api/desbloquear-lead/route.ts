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
  const { orgId, usuarioId, acesso } = gate.ctx!;

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

  // No Teste grátis, o lead pode desbloquear no máximo 25 leads (mesmo
  // que o saldo seja maior). Gold/Platinum não têm esse teto.
  if (acesso.plano === "teste") {
    const { count } = await admin
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("organizacao_id", orgId)
      .not("contato_desbloqueado_em", "is", null);
    if ((count ?? 0) >= 25) {
      return NextResponse.json(
        {
          erro:
            "Você atingiu o limite de 25 leads no teste grátis. Assine um plano para desbloquear mais.",
          motivo: "limite_leads_teste",
        },
        { status: 403 }
      );
    }
  }

  // ============================================================
  // Localização dos créditos de lead
  // ============================================================
  // IMPORTANTE: a tabela creditos_contatos NÃO tem coluna "id" - o
  // identificador é "usuario_id" (+ organizacao_id). Um único registro
  // por organização garantido pelo índice único idx_creditos_contatos_org_uniq.
  const [{ data: orgCredito }, { data: userCredito }] = await Promise.all([
    admin
      .from("creditos_contatos")
      .select("usuario_id, organizacao_id, saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle(),
    admin
      .from("creditos_contatos")
      .select("usuario_id, organizacao_id, saldo")
      .eq("usuario_id", usuarioId)
      .maybeSingle(),
  ]);

  // Prefere a linha da organização; senão usa a linha do próprio usuário.
  const melhorCredito = (orgCredito?.saldo ?? 0) > 0 ? orgCredito : userCredito;

  // Se a linha do usuário existir mas estiver sem organização, realinha.
  if (!orgCredito && userCredito && !userCredito.organizacao_id) {
    await admin
      .from("creditos_contatos")
      .update({ organizacao_id: orgId })
      .eq("usuario_id", userCredito.usuario_id);
  }

  const saldoAtual = melhorCredito?.saldo ?? 0;
  const chaveDebito = orgCredito ? "organizacao_id" : melhorCredito ? "usuario_id" : "";
  const valorDebito = orgCredito ? orgId : melhorCredito?.usuario_id ?? "";

  if (!chaveDebito || saldoAtual <= 0) {
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
    })
    .eq(chaveDebito, valorDebito)
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
      .update({ saldo: saldoAtual })
      .eq(chaveDebito, valorDebito);

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
