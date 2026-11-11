import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../../lib/gate";
import { ehMembroAtivo } from "../../../../../lib/crm";
import { UUID, erro, lerCorpo, somenteAdmin, texto } from "../../../../../lib/crm-api";
import { COLUNAS_LEAD, ETIQUETAS_LEAD, converterLead, type LinhaLead } from "../../../../../lib/crm-leads";

async function carregar(ctx: { supabase: Parameters<typeof converterLead>[0]; orgId: string }, id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await ctx.supabase.from("crm_leads").select(COLUNAS_LEAD).eq("id", id).eq("organizacao_id", ctx.orgId).maybeSingle();
  return (data as LinhaLead | null) ?? null;
}

/** PATCH: edita o lead ou muda o status (arquivar / reabrir). */
export async function PATCH(req: Request, { params }: RouteContext<"/api/crm/leads/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const { id } = await params;
  const lead = await carregar({ supabase, orgId }, id);
  if (!lead) return erro("Lead não encontrado.", 404);
  const corpo = await lerCorpo(req);
  if (!corpo) return erro("JSON inválido.");

  const mudancas: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (corpo.titulo !== undefined) {
    const titulo = texto(corpo.titulo, 200);
    if (!titulo) return erro("Dê um título ao lead.");
    mudancas.titulo = titulo;
  }
  if (corpo.observacao !== undefined) mudancas.observacao = texto(corpo.observacao, 5000);
  if (corpo.valor !== undefined) {
    mudancas.valor = typeof corpo.valor === "number" && Number.isFinite(corpo.valor) && corpo.valor >= 0 ? corpo.valor : null;
  }
  if (corpo.etiqueta !== undefined) {
    mudancas.etiqueta = typeof corpo.etiqueta === "string" && (ETIQUETAS_LEAD as readonly string[]).includes(corpo.etiqueta) ? corpo.etiqueta : null;
  }
  if (corpo.responsavel_id !== undefined) {
    if (typeof corpo.responsavel_id !== "string" || !(await ehMembroAtivo(supabase, orgId, corpo.responsavel_id))) {
      return erro("Responsável não faz parte desta organização.");
    }
    mudancas.responsavel_id = corpo.responsavel_id;
  }
  if (corpo.company_id !== undefined) {
    if (corpo.company_id === null) mudancas.company_id = null;
    else {
      const { data } = await supabase.from("companies").select("id").eq("id", String(corpo.company_id)).eq("organizacao_id", orgId).maybeSingle();
      if (!data) return erro("Organização não encontrada.");
      mudancas.company_id = data.id;
    }
  }
  if (corpo.pessoa_id !== undefined) {
    if (corpo.pessoa_id === null) mudancas.pessoa_id = null;
    else {
      const { data } = await supabase.from("contatos").select("id").eq("id", String(corpo.pessoa_id)).eq("organizacao_id", orgId).maybeSingle();
      if (!data) return erro("Pessoa não encontrada.");
      mudancas.pessoa_id = data.id;
    }
  }
  if (corpo.status !== undefined) {
    if (corpo.status !== "aberto" && corpo.status !== "arquivado") return erro("Status inválido.");
    if (lead.status === "convertido") return erro("Este lead já virou negócio.");
    mudancas.status = corpo.status;
  }

  const { data, error } = await supabase.from("crm_leads").update(mudancas).eq("id", id).eq("organizacao_id", orgId).select(COLUNAS_LEAD).single();
  if (error || !data) return erro("Não foi possível salvar o lead.", 500);
  return NextResponse.json({ lead: data });
}

/** POST { pipeline_id?, stage_id? }: transforma o lead em negócio. */
export async function POST(req: Request, { params }: RouteContext<"/api/crm/leads/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, usuarioId } = ctx!;
  const { id } = await params;
  const lead = await carregar({ supabase, orgId }, id);
  if (!lead) return erro("Lead não encontrado.", 404);
  if (lead.status === "convertido") return erro("Este lead já virou negócio.");
  const corpo = (await lerCorpo(req)) ?? {};
  const r = await converterLead(supabase, orgId, usuarioId, lead, {
    pipeline_id: typeof corpo.pipeline_id === "string" ? corpo.pipeline_id : null,
    stage_id: typeof corpo.stage_id === "string" ? corpo.stage_id : null,
  });
  if (!r.ok) return erro(r.erro, r.status);
  return NextResponse.json(r);
}

/** DELETE: apaga o lead (só administradores; os demais arquivam). */
export async function DELETE(_req: Request, { params }: RouteContext<"/api/crm/leads/[id]">) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;
  const { id } = await params;
  if (!UUID.test(id)) return erro("Lead inválido.");
  const { error } = await supabase.from("crm_leads").delete().eq("id", id).eq("organizacao_id", orgId);
  if (error) return erro("Não foi possível apagar o lead.", 500);
  return NextResponse.json({ ok: true });
}
