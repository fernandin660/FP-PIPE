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
  const { orgId } = gate.ctx!;

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

  // A empresa precisa existir na conta do usuário.
  const { data: empresa } = await admin
    .from("companies")
    .select("id, contato_desbloqueado_em")
    .eq("organizacao_id", orgId)
    .eq("cnpj", cnpj)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

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

  const mes = new Date().toISOString().slice(0, 7);

  const { data: creditos } = await admin
    .from("creditos_contatos")
    .select("saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();

  const saldoAtual = creditos?.saldo ?? 0;

  if (saldoAtual <= 0) {
    return NextResponse.json(
      {
        erro:
          "Você usou seus créditos de lead. Compre mais ou faça upgrade em /planos.",
        motivo: "limite_creditos",
      },
      { status: 403 }
    );
  }

  const agora = new Date().toISOString();

  // Débito atômico: uma única query que só debita se saldo > 0.
  // Evita race condition (requests simultâneos drenando saldo negativo).
  const { data: novoSaldo } = await admin
    .from("creditos_contatos")
    .update({
      saldo: saldoAtual - 1,
      atualizado_em: agora,
    })
    .eq("organizacao_id", orgId)
    .gt("saldo", 0)
    .select("saldo")
    .maybeSingle();

  if (!novoSaldo) {
    return NextResponse.json(
      {
        erro:
          "Você usou seus créditos de lead. Compre mais ou faça upgrade em /planos.",
        motivo: "limite_creditos",
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
      .eq("organizacao_id", orgId);

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
