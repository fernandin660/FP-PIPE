import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { validarCampos } from "../../../../lib/crm-campos";
import { erro, lerCorpo, texto } from "../../../../lib/crm-api";
import { EMAIL_VALIDO, nomeOrganizacao, termoBusca } from "../../../../lib/crm-cadastros";
import { ehEstagioGanho, ehEstagioPerdido } from "../../../../lib/crm-previsao";

const POR_PAGINA = 50;
const COLUNAS =
  "id, razao_social, nome_fantasia, cnpj, segmento_icp, municipio, uf, telefone, email, website, origem, score, campos, atualizado_em, criado_em";

type Linha = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  segmento_icp: string | null;
  municipio: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  website: string | null;
  origem: string | null;
  score: number | null;
  campos: Record<string, unknown> | null;
  atualizado_em: string;
  criado_em: string;
};

/**
 * GET: lista de organizações.
 * escopo=crm (padrão): empresas com negócio, com pessoas ou cadastradas à mão/pelo site.
 * escopo=todas: todas as empresas da organização (inclui as das listas de prospecção).
 */
export async function GET(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;

  const url = new URL(req.url);
  const escopo = url.searchParams.get("escopo") === "todas" ? "todas" : "crm";
  const busca = termoBusca(url.searchParams.get("busca"));
  const pagina = Math.max(1, Math.min(200, Number(url.searchParams.get("pagina")) || 1));

  const [{ data: negocios }, { data: pessoas }, { data: etapas }] = await Promise.all([
    supabase.from("lead_pipeline").select("company_id, stage_id, valor_oportunidade").eq("organizacao_id", orgId),
    supabase.from("contatos").select("company_id").eq("organizacao_id", orgId).not("company_id", "is", null),
    supabase.from("pipeline_stages").select("id, nome").eq("organizacao_id", orgId),
  ]);
  const nomeEtapa = new Map((etapas ?? []).map((e) => [e.id as string, e.nome as string]));
  const resumo = new Map<string, { abertos: number; valorAberto: number; ganhos: number; pessoas: number }>();
  const pegar = (id: string) => {
    let r = resumo.get(id);
    if (!r) resumo.set(id, (r = { abertos: 0, valorAberto: 0, ganhos: 0, pessoas: 0 }));
    return r;
  };
  for (const n of (negocios ?? []) as Array<{ company_id: string; stage_id: string; valor_oportunidade: number | null }>) {
    const r = pegar(n.company_id);
    const etapa = nomeEtapa.get(n.stage_id);
    if (ehEstagioGanho(etapa)) r.ganhos++;
    else if (!ehEstagioPerdido(etapa)) {
      r.abertos++;
      r.valorAberto += n.valor_oportunidade ?? 0;
    }
  }
  for (const p of (pessoas ?? []) as Array<{ company_id: string }>) pegar(p.company_id).pessoas++;

  let consulta = supabase.from("companies").select(COLUNAS, { count: "exact" }).eq("organizacao_id", orgId);
  if (busca) {
    consulta = consulta.or(`razao_social.ilike.%${busca}%,nome_fantasia.ilike.%${busca}%,cnpj.ilike.%${busca}%,municipio.ilike.%${busca}%`);
  }

  let linhas: Linha[] = [];
  let total = 0;
  if (escopo === "todas") {
    const { data, count } = await consulta
      .order("atualizado_em", { ascending: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
    linhas = (data as Linha[]) ?? [];
    total = count ?? 0;
  } else {
    // No CRM: quem tem negócio/pessoa + cadastros manuais e do site.
    const ids = [...resumo.keys()];
    const [porId, manuais] = await Promise.all([
      ids.length ? consulta.in("id", ids.slice(0, 1000)) : Promise.resolve({ data: [] as Linha[] }),
      (busca
        ? supabase
            .from("companies")
            .select(COLUNAS)
            .eq("organizacao_id", orgId)
            .in("origem", ["manual", "site"])
            .or(`razao_social.ilike.%${busca}%,nome_fantasia.ilike.%${busca}%,cnpj.ilike.%${busca}%,municipio.ilike.%${busca}%`)
        : supabase.from("companies").select(COLUNAS).eq("organizacao_id", orgId).in("origem", ["manual", "site"])
      ).limit(1000),
    ]);
    const mapa = new Map<string, Linha>();
    for (const l of [...((porId.data as Linha[]) ?? []), ...((manuais.data as Linha[]) ?? [])]) mapa.set(l.id, l);
    const todas = [...mapa.values()].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em));
    total = todas.length;
    linhas = todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  }

  return NextResponse.json({
    total,
    pagina,
    por_pagina: POR_PAGINA,
    organizacoes: linhas.map((l) => {
      const r = resumo.get(l.id);
      return {
        id: l.id,
        nome: nomeOrganizacao(l),
        razao_social: l.razao_social,
        cnpj: l.cnpj,
        segmento: l.segmento_icp,
        cidade: [l.municipio, l.uf].filter(Boolean).join(" / ") || null,
        telefone: l.telefone,
        email: l.email,
        website: l.website,
        origem: l.origem,
        score: l.score,
        campos: l.campos ?? {},
        negocios_abertos: r?.abertos ?? 0,
        valor_aberto: r?.valorAberto ?? 0,
        negocios_ganhos: r?.ganhos ?? 0,
        pessoas: r?.pessoas ?? 0,
        atualizado_em: l.atualizado_em,
      };
    }),
  });
}

/** POST: cadastra uma organização à mão. */
export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, usuarioId } = ctx!;

  const corpo = await lerCorpo(req);
  const nome = texto(corpo?.nome, 160);
  if (!nome) return erro("Informe o nome da organização.");

  const cnpjDigitos = typeof corpo?.cnpj === "string" ? corpo.cnpj.replace(/\D/g, "") : "";
  if (cnpjDigitos && cnpjDigitos.length !== 14) return erro("CNPJ deve ter 14 dígitos.");
  const email = texto(corpo?.email, 254)?.toLowerCase() ?? null;
  if (email && !EMAIL_VALIDO.test(email)) return erro("E-mail inválido.");
  const website = texto(corpo?.website, 300);
  if (website && !/^https?:\/\//i.test(website)) return erro("O site deve começar com http:// ou https://.");

  let campos: Record<string, unknown> = {};
  if (corpo?.campos !== undefined) {
    const v = await validarCampos(supabase, orgId, "organizacao", corpo.campos);
    if (!v.ok) return erro(v.erro);
    campos = v.valores;
  }

  if (cnpjDigitos) {
    const { data: existente } = await supabase
      .from("companies")
      .select("id")
      .eq("organizacao_id", orgId)
      .eq("cnpj", cnpjDigitos)
      .maybeSingle();
    if (existente) return NextResponse.json({ erro: "Esta organização já está cadastrada.", id: existente.id }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({
      usuario_id: usuarioId,
      organizacao_id: orgId,
      razao_social: nome,
      nome_fantasia: nome,
      cnpj: cnpjDigitos || null,
      email,
      telefone: texto(corpo?.telefone, 40),
      website,
      municipio: texto(corpo?.municipio, 80),
      uf: texto(corpo?.uf, 40),
      segmento_icp: texto(corpo?.segmento, 120),
      endereco: texto(corpo?.endereco, 300),
      origem: "manual",
      fonte: "manual",
      confirmado: true,
      campos,
    })
    .select("id")
    .single();
  if (error || !data) return erro("Não foi possível cadastrar a organização.", 500);
  return NextResponse.json({ id: data.id }, { status: 201 });
}
