import type { criarClienteSupabaseServidor } from "./supabase/server";
import { resolverFunil } from "./crm";

type ClienteServidor = NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServidor>>>;

export const ETIQUETAS_LEAD = ["quente", "morno", "frio"] as const;
export const STATUS_LEAD = ["aberto", "arquivado", "convertido"] as const;

export const COLUNAS_LEAD =
  "id, titulo, company_id, pessoa_id, responsavel_id, valor, origem, etiqueta, observacao, status, negocio_id, criado_por, criado_em, atualizado_em";

export type LinhaLead = {
  id: string;
  titulo: string;
  company_id: string | null;
  pessoa_id: string | null;
  responsavel_id: string | null;
  valor: number | null;
  origem: string;
  etiqueta: string | null;
  observacao: string | null;
  status: string;
  negocio_id: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

/**
 * Converte um lead da caixa de entrada em negócio no funil escolhido.
 * Se a organização já tem negócio naquele funil, o lead é ligado a ele
 * (uma empresa tem no máximo um negócio por funil).
 */
export async function converterLead(
  supabase: ClienteServidor,
  orgId: string,
  usuarioId: string,
  lead: LinhaLead,
  opcoes: { pipeline_id?: string | null; stage_id?: string | null }
): Promise<{ ok: true; negocio_id: string; ja_existia: boolean } | { ok: false; erro: string; status: number }> {
  if (!lead.company_id) {
    return { ok: false, erro: "Escolha a organização do lead antes de transformar em negócio.", status: 400 };
  }
  const { funil } = await resolverFunil(supabase, orgId, opcoes.pipeline_id ?? null);
  if (!funil) return { ok: false, erro: "Funil não configurado.", status: 500 };

  const { data: existente } = await supabase
    .from("lead_pipeline")
    .select("id")
    .eq("organizacao_id", orgId)
    .eq("company_id", lead.company_id)
    .eq("pipeline_id", funil.id)
    .limit(1)
    .maybeSingle();

  let negocioId: string;
  let jaExistia = false;
  if (existente) {
    negocioId = existente.id as string;
    jaExistia = true;
  } else {
    const { data: etapas } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("organizacao_id", orgId)
      .eq("pipeline_id", funil.id)
      .order("ordem_estagio", { ascending: true });
    const ids = (etapas ?? []).map((e) => e.id as string);
    const stageId = (opcoes.stage_id && ids.includes(opcoes.stage_id) ? opcoes.stage_id : ids[0]) ?? null;
    if (!stageId) return { ok: false, erro: "O funil não tem etapas.", status: 500 };

    const { count } = await supabase
      .from("lead_pipeline")
      .select("id", { count: "exact", head: true })
      .eq("organizacao_id", orgId)
      .eq("stage_id", stageId);

    const responsavel = lead.responsavel_id ?? usuarioId;
    const { data: novo, error } = await supabase
      .from("lead_pipeline")
      .insert({
        organizacao_id: orgId,
        company_id: lead.company_id,
        stage_id: stageId,
        responsavel_id: responsavel,
        ordenacao: count ?? 0,
        titulo: lead.titulo.slice(0, 160),
        valor_oportunidade: lead.valor,
        pessoa_id: lead.pessoa_id,
      })
      .select("id")
      .single();
    if (error || !novo) return { ok: false, erro: "Não foi possível criar o negócio.", status: 500 };
    negocioId = novo.id as string;

    await supabase.from("pipeline_historico").insert({
      organizacao_id: orgId,
      lead_pipeline_id: negocioId,
      company_id: lead.company_id,
      usuario_id: usuarioId,
      tipo_evento: "lead_adicionado",
      stage_destino_id: stageId,
      dados: { responsavel_id: responsavel, origem: "caixa_de_entrada", lead_id: lead.id },
    });
    if (lead.observacao?.trim()) {
      await supabase.from("pipeline_historico").insert({
        organizacao_id: orgId,
        lead_pipeline_id: negocioId,
        company_id: lead.company_id,
        usuario_id: usuarioId,
        tipo_evento: "atividade",
        dados: {
          tipo_atividade: "observacao",
          titulo: "Nota do lead",
          observacao: lead.observacao.slice(0, 5000),
          data_hora_atividade: new Date().toISOString(),
        },
      });
    }
  }

  await supabase
    .from("crm_leads")
    .update({ status: "convertido", negocio_id: negocioId, atualizado_em: new Date().toISOString() })
    .eq("id", lead.id)
    .eq("organizacao_id", orgId);

  return { ok: true, negocio_id: negocioId, ja_existia: jaExistia };
}
