import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../../lib/gate";
import { UUID, erro, lerCorpo } from "../../../../../lib/crm-api";
import { dadosPessoa, nomeOrganizacao, primeiroEmail, primeiroTelefone } from "../../../../../lib/crm-cadastros";

/** GET: ficha da pessoa com organização e negócios em que é contato. */
export async function GET(_req: Request, { params }: RouteContext<"/api/crm/pessoas/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const { id } = await params;
  if (!UUID.test(id)) return erro("Pessoa inválida.");

  const { data: p } = await supabase
    .from("contatos")
    .select("id, nome, cargo, email, emails, telefone, telefones, linkedin_url, company_id, empresa, observacoes, campos, origem, criado_em, atualizado_em")
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (!p) return erro("Pessoa não encontrada.", 404);

  const [{ data: empresa }, { data: negocios }, { data: etapas }] = await Promise.all([
    p.company_id
      ? supabase.from("companies").select("id, razao_social, nome_fantasia").eq("id", p.company_id).eq("organizacao_id", orgId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("lead_pipeline")
      .select("id, titulo, company_id, stage_id, valor_oportunidade")
      .eq("organizacao_id", orgId)
      .eq("pessoa_id", id),
    supabase.from("pipeline_stages").select("id, nome, cor").eq("organizacao_id", orgId),
  ]);
  const etapa = new Map((etapas ?? []).map((e) => [e.id as string, e]));

  return NextResponse.json({
    pessoa: {
      ...p,
      email: primeiroEmail(p),
      telefone: primeiroTelefone(p),
      emails_extras: (p.emails ?? []).filter((e: string) => e && e !== primeiroEmail(p)),
      telefones_extras: (p.telefones ?? []).filter((t: string) => t && t !== primeiroTelefone(p)),
      organizacao: empresa ? { id: empresa.id, nome: nomeOrganizacao(empresa) } : p.empresa ? { id: null, nome: p.empresa } : null,
      campos: p.campos ?? {},
    },
    negocios: (negocios ?? []).map((n) => ({
      ...n,
      etapa: etapa.get(n.stage_id as string)?.nome ?? null,
      cor: etapa.get(n.stage_id as string)?.cor ?? null,
    })),
  });
}

/** PATCH: edita a pessoa. */
export async function PATCH(req: Request, { params }: RouteContext<"/api/crm/pessoas/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const { id } = await params;
  if (!UUID.test(id)) return erro("Pessoa inválida.");

  const corpo = await lerCorpo(req);
  if (!corpo) return erro("JSON inválido.");
  const v = await dadosPessoa(supabase, orgId, corpo, true);
  if (!v.ok) return erro(v.erro);
  if (Object.keys(v.dados).length === 0) return erro("Nada para alterar.");

  const { data, error } = await supabase
    .from("contatos")
    .update({ ...v.dados, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select("id")
    .maybeSingle();
  if (error || !data) return erro("Pessoa não encontrada.", 404);
  return NextResponse.json({ ok: true });
}

/** DELETE: apaga a pessoa (os negócios ficam sem pessoa de contato). */
export async function DELETE(_req: Request, { params }: RouteContext<"/api/crm/pessoas/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const { id } = await params;
  if (!UUID.test(id)) return erro("Pessoa inválida.");

  const { data, error } = await supabase
    .from("contatos")
    .delete()
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select("id")
    .maybeSingle();
  if (error || !data) return erro("Pessoa não encontrada.", 404);
  return NextResponse.json({ ok: true });
}
