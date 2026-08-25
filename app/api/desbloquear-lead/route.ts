import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";

// Desbloqueio REAL de contato: debita 1 crédito de lead e marca
// a empresa como desbloqueada (companies.contato_desbloqueado_em).
// Só leads marcados assim podem entrar em listas salvas.
export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) {
    return gate.resposta;
  }
  const { usuarioId } = gate.ctx!;

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
    .eq("usuario_id", usuarioId)
    .eq("cnpj", cnpj)
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
    .eq("usuario_id", usuarioId)
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

  // Marca PRIMEIRO: se falhar (ex.: coluna ainda não criada), o
  // usuário não é cobrado. Cobrar e falhar seria perder crédito à toa.
  const { error: erroMarca } = await admin
    .from("companies")
    .update({ contato_desbloqueado_em: agora })
    .eq("id", empresa.id);

  if (erroMarca) {
    return NextResponse.json(
      {
        erro:
          "Não conseguimos registrar o desbloqueio. Rode o SQL supabase-contato-desbloqueado.sql no Supabase.",
      },
      { status: 500 }
    );
  }

  // Débito com cliente admin: usuário não pode manipular via RLS.
  await admin
    .from("creditos_contatos")
    .update({
      saldo: Math.max(0, saldoAtual - 1),
      atualizado_em: agora,
    })
    .eq("usuario_id", usuarioId);

  return NextResponse.json({
    ok: true,
    jaDesbloqueado: false,
    novoSaldo: Math.max(0, saldoAtual - 1),
  });
}
