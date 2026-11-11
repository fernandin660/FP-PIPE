import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { UUID, erro, lerCorpo } from "../../../../lib/crm-api";
import { dadosPessoa, nomeOrganizacao, primeiroEmail, primeiroTelefone, termoBusca } from "../../../../lib/crm-cadastros";

const POR_PAGINA = 50;

/** GET: pessoas da organização (busca por nome, cargo ou e-mail; filtro por organização). */
export async function GET(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;

  const url = new URL(req.url);
  const busca = termoBusca(url.searchParams.get("busca"));
  const empresa = url.searchParams.get("organizacao");
  const pagina = Math.max(1, Math.min(200, Number(url.searchParams.get("pagina")) || 1));

  let consulta = supabase
    .from("contatos")
    .select("id, nome, cargo, email, emails, telefone, telefones, linkedin_url, company_id, empresa, campos, criado_em, atualizado_em", { count: "exact" })
    .eq("organizacao_id", orgId);
  if (empresa && UUID.test(empresa)) consulta = consulta.eq("company_id", empresa);
  if (busca) consulta = consulta.or(`nome.ilike.%${busca}%,cargo.ilike.%${busca}%,email.ilike.%${busca}%,empresa.ilike.%${busca}%`);

  const { data, count } = await consulta
    .order("nome", { ascending: true, nullsFirst: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  const linhas = data ?? [];

  const idsEmpresas = [...new Set(linhas.map((p) => p.company_id).filter((x): x is string => Boolean(x)))];
  const idsPessoas = linhas.map((p) => p.id as string);
  const [{ data: empresas }, { data: negocios }] = await Promise.all([
    idsEmpresas.length
      ? supabase.from("companies").select("id, razao_social, nome_fantasia").eq("organizacao_id", orgId).in("id", idsEmpresas)
      : Promise.resolve({ data: [] }),
    idsPessoas.length
      ? supabase.from("lead_pipeline").select("pessoa_id").eq("organizacao_id", orgId).in("pessoa_id", idsPessoas)
      : Promise.resolve({ data: [] }),
  ]);
  const nomeEmpresa = new Map(
    ((empresas ?? []) as Array<{ id: string; razao_social: string | null; nome_fantasia: string | null }>).map((e) => [e.id, nomeOrganizacao(e)])
  );
  const negociosPorPessoa = new Map<string, number>();
  for (const n of (negocios ?? []) as Array<{ pessoa_id: string }>) {
    negociosPorPessoa.set(n.pessoa_id, (negociosPorPessoa.get(n.pessoa_id) ?? 0) + 1);
  }

  return NextResponse.json({
    total: count ?? 0,
    pagina,
    por_pagina: POR_PAGINA,
    pessoas: linhas.map((p) => ({
      id: p.id,
      nome: p.nome,
      cargo: p.cargo,
      email: primeiroEmail(p),
      telefone: primeiroTelefone(p),
      linkedin_url: p.linkedin_url,
      organizacao_id: p.company_id,
      organizacao: (p.company_id && nomeEmpresa.get(p.company_id)) || p.empresa || null,
      negocios: negociosPorPessoa.get(p.id as string) ?? 0,
      campos: p.campos ?? {},
      atualizado_em: p.atualizado_em,
    })),
  });
}

/** POST: cadastra uma pessoa. */
export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, usuarioId } = ctx!;

  const corpo = await lerCorpo(req);
  if (!corpo) return erro("JSON inválido.");
  const v = await dadosPessoa(supabase, orgId, corpo, false);
  if (!v.ok) return erro(v.erro);

  const { data, error } = await supabase
    .from("contatos")
    .insert({ ...v.dados, usuario_id: usuarioId, organizacao_id: orgId, origem: "manual" })
    .select("id")
    .single();
  if (error || !data) return erro("Não foi possível cadastrar a pessoa.", 500);
  return NextResponse.json({ id: data.id }, { status: 201 });
}
