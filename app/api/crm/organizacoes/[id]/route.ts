import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../../lib/gate";
import { validarCampos } from "../../../../../lib/crm-campos";
import { UUID, erro, lerCorpo, texto } from "../../../../../lib/crm-api";
import { EMAIL_VALIDO, nomeOrganizacao, primeiroEmail, primeiroTelefone } from "../../../../../lib/crm-cadastros";

/** GET: ficha da organização com pessoas, negócios e histórico recente. */
export async function GET(_req: Request, { params }: RouteContext<"/api/crm/organizacoes/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const { id } = await params;
  if (!UUID.test(id)) return erro("Organização inválida.");

  const { data: empresa } = await supabase
    .from("companies")
    .select(
      "id, razao_social, nome_fantasia, cnpj, segmento_icp, cnae_descricao, porte, municipio, uf, endereco, telefone, email, website, linkedin, origem, score, score_motivo, informacoes_adicionais, campos, criado_em, atualizado_em"
    )
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (!empresa) return erro("Organização não encontrada.", 404);

  const [{ data: pessoas }, { data: negocios }, { data: etapas }, { data: funis }, { data: historico }] = await Promise.all([
    supabase
      .from("contatos")
      .select("id, nome, cargo, email, emails, telefone, telefones, linkedin_url")
      .eq("organizacao_id", orgId)
      .eq("company_id", id)
      .order("nome"),
    supabase
      .from("lead_pipeline")
      .select("id, titulo, stage_id, pipeline_id, valor_oportunidade, data_prevista, responsavel_id, pessoa_id, atualizado_em")
      .eq("organizacao_id", orgId)
      .eq("company_id", id),
    supabase.from("pipeline_stages").select("id, nome, cor").eq("organizacao_id", orgId),
    supabase.from("pipelines").select("id, nome").eq("organizacao_id", orgId),
    supabase
      .from("pipeline_historico")
      .select("id, tipo_evento, dados, criado_em, stage_destino_id")
      .eq("organizacao_id", orgId)
      .eq("company_id", id)
      .order("criado_em", { ascending: false })
      .limit(30),
  ]);
  const etapa = new Map((etapas ?? []).map((e) => [e.id as string, e]));
  const funil = new Map((funis ?? []).map((f) => [f.id as string, f.nome as string]));

  return NextResponse.json({
    organizacao: { ...empresa, nome: nomeOrganizacao(empresa), campos: empresa.campos ?? {} },
    pessoas: (pessoas ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      cargo: p.cargo,
      email: primeiroEmail(p),
      telefone: primeiroTelefone(p),
      linkedin_url: p.linkedin_url,
    })),
    negocios: (negocios ?? []).map((n) => ({
      ...n,
      etapa: etapa.get(n.stage_id as string)?.nome ?? null,
      cor: etapa.get(n.stage_id as string)?.cor ?? null,
      funil: funil.get(n.pipeline_id as string) ?? null,
    })),
    historico: historico ?? [],
  });
}

/** PATCH: edita os dados da organização. */
export async function PATCH(req: Request, { params }: RouteContext<"/api/crm/organizacoes/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const { id } = await params;
  if (!UUID.test(id)) return erro("Organização inválida.");

  const corpo = await lerCorpo(req);
  if (!corpo) return erro("JSON inválido.");

  const mudancas: Record<string, unknown> = {};
  const textos: Array<[string, string, number]> = [
    ["nome_fantasia", "nome_fantasia", 160],
    ["razao_social", "razao_social", 160],
    ["telefone", "telefone", 40],
    ["municipio", "municipio", 80],
    ["uf", "uf", 40],
    ["segmento", "segmento_icp", 120],
    ["endereco", "endereco", 300],
    ["informacoes_adicionais", "informacoes_adicionais", 5000],
  ];
  for (const [entrada, coluna, max] of textos) {
    if (corpo[entrada] !== undefined) mudancas[coluna] = texto(corpo[entrada], max);
  }
  if (corpo.email !== undefined) {
    const email = texto(corpo.email, 254)?.toLowerCase() ?? null;
    if (email && !EMAIL_VALIDO.test(email)) return erro("E-mail inválido.");
    mudancas.email = email;
  }
  if (corpo.website !== undefined) {
    const site = texto(corpo.website, 300);
    if (site && !/^https?:\/\//i.test(site)) return erro("O site deve começar com http:// ou https://.");
    mudancas.website = site;
  }
  if (corpo.campos !== undefined) {
    const v = await validarCampos(supabase, orgId, "organizacao", corpo.campos);
    if (!v.ok) return erro(v.erro);
    mudancas.campos = v.valores;
  }
  if ("nome_fantasia" in mudancas && !mudancas.nome_fantasia && !mudancas.razao_social) {
    return erro("A organização precisa de um nome.");
  }
  if (Object.keys(mudancas).length === 0) return erro("Nada para alterar.");
  mudancas.atualizado_em = new Date().toISOString();

  const { data, error } = await supabase
    .from("companies")
    .update(mudancas)
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select("id")
    .maybeSingle();
  if (error || !data) return erro("Organização não encontrada.", 404);
  return NextResponse.json({ ok: true });
}
