import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { LIMITES_MENSAIS, limitesEfetivos } from "../../../lib/avisos";

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

  const mes = new Date().toISOString().slice(0, 7);

  const { data: usoApis } = await admin
    .from("uso_apis")
    .select("api, chamadas")
    .eq("mes", mes);

  const mapaUso = new Map<string, number>(
    (usoApis ?? []).map((u) => [u.api, u.chamadas])
  );

  const efetivos = await limitesEfetivos();

  const { data: ajustes } = await admin
    .from("limites_apis")
    .select("api");
  const ajustados = new Set((ajustes ?? []).map((a) => a.api));

  const apis = Object.keys(LIMITES_MENSAIS).map((api) => ({
    api,
    chamadas: mapaUso.get(api) ?? 0,
    limite: efetivos[api] ?? LIMITES_MENSAIS[api],
    ajustado: ajustados.has(api),
  }));

  const { data: listaUsuarios } = await admin.auth.admin.listUsers({
    perPage: 500,
  });

  const mapaEmails = new Map<string, string>(
    (listaUsuarios?.users ?? []).map((u) => [
      u.id,
      u.email ?? u.id.slice(0, 8),
    ])
  );

  const fontesDeMoeda = [
    { chave: "listas", nome: "🧭 Créditos de listas", tabela: "creditos" },
    {
      chave: "buscador",
      nome: "🔎 Créditos de buscador",
      tabela: "creditos_contatos",
    },
    {
      chave: "abordagens",
      nome: "✍️ Créditos de abordagem (IA)",
      tabela: "creditos_ia",
    },
  ];

  const moedas = [];

  for (const fonte of fontesDeMoeda) {
    const { data: linhas } = await admin
      .from(fonte.tabela)
      .select("saldo, usuario_id");

    const usuarios = (linhas ?? [])
      .filter((l) => (l.saldo ?? 0) > 0)
      .map((l) => ({
        email: mapaEmails.get(l.usuario_id) ?? "usuário",
        saldo: l.saldo ?? 0,
      }))
      .sort((a, b) => b.saldo - a.saldo);

    moedas.push({
      chave: fonte.chave,
      nome: fonte.nome,
      total: usuarios.reduce((soma, u) => soma + u.saldo, 0),
      usuarios,
    });
  }

  return NextResponse.json({ mes, apis, moedas });
}
