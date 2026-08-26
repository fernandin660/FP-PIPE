import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";

type Resultado = {
  id: string;
  origem: "lista" | "contato";
  nome: string;
  empresa: string;
  linkedin_url: string | null;
  cargo: string | null;
  email: string | null;
};

export async function GET(requisicao: Request) {
  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) {
    return NextResponse.json({ erro: "Autenticação não configurada." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Faça login novamente." }, { status: 401 });
  }

  const url = new URL(requisicao.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  const termo = `%${q}%`;

  // Busca em paralelo: empresas (companies) + contatos salvos
  const [empresasRes, contatosRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, nome_fantasia, razao_social")
      .or(`nome_fantasia.ilike.${termo},razao_social.ilike.${termo}`)
      .limit(8),
    supabase
      .from("contatos")
      .select("id, nome, empresa, linkedin_url, cargo, email")
      .eq("usuario_id", user.id)
      .or(`nome.ilike.${termo},empresa.ilike.${termo}`)
      .order("criado_em", { ascending: false })
      .limit(8),
  ]);

  const resultados: Resultado[] = [];

  // Contatos salvos primeiro (mais relevantes)
  for (const c of contatosRes.data ?? []) {
    resultados.push({
      id: c.id,
      origem: "contato",
      nome: c.nome ?? "",
      empresa: c.empresa ?? "",
      linkedin_url: c.linkedin_url ?? null,
      cargo: c.cargo ?? null,
      email: c.email ?? null,
    });
  }

  // Empresas da prospecção
  for (const e of empresasRes.data ?? []) {
    resultados.push({
      id: e.id,
      origem: "lista",
      nome: "",
      empresa: e.nome_fantasia || e.razao_social || "",
      linkedin_url: null,
      cargo: null,
      email: null,
    });
  }

  return NextResponse.json({ resultados });
}
