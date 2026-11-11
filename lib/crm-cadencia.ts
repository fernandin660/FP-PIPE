import type { SupabaseClient } from "@supabase/supabase-js";

type ParametrosEntrada = {
  orgId: string;
  usuarioId: string;
  leadPipelineId: string;
  companyId: string;
  cadenciaId: string;
};

export type ResultadoEntrada =
  | { ok: true; nome: string; totalEtapas: number }
  | { ok: false; erro: string; status: number };

/**
 * Coloca um lead numa cadência: cria/atualiza o vínculo em lead_cadencia,
 * cancela atividades programadas anteriores, agenda todas as etapas como
 * atividades programadas e registra "cadencia_iniciada".
 *
 * Usado pela rota individual (/api/crm/cadencia) e pela rota em lote
 * (/api/crm/batch). O chamador deve garantir que o lead pertence à org.
 */
export async function iniciarCadenciaLead(
  supabase: SupabaseClient,
  { orgId, usuarioId, leadPipelineId, companyId, cadenciaId }: ParametrosEntrada
): Promise<ResultadoEntrada> {
  const { data: cadencia } = await supabase
    .from("cadencia")
    .select("id, nome")
    .eq("id", cadenciaId)
    .eq("organizacao_id", orgId)
    .maybeSingle();

  if (!cadencia) {
    return { ok: false, erro: "Cadência não encontrada nesta organização.", status: 404 };
  }

  const { data: etapas } = await supabase
    .from("cadencia_etapas")
    .select("id, ordem, tipo_atividade, titulo, atraso_dias, script")
    .eq("cadencia_id", cadenciaId)
    .order("ordem", { ascending: true });

  const passos = etapas ?? [];

  // Cria/atualiza o vínculo de cadência do lead.
  const { data: ativa } = await supabase
    .from("lead_cadencia")
    .select("id")
    .eq("organizacao_id", orgId)
    .eq("lead_pipeline_id", leadPipelineId)
    .maybeSingle();

  const proximaEm = passos[0]
    ? new Date(Date.now() + (passos[0].atraso_dias ?? 0) * 86400000).toISOString()
    : null;

  const { error: erroVinculo } = ativa
    ? await supabase
        .from("lead_cadencia")
        .update({
          cadencia_id: cadenciaId,
          etapa_atual_id: passos[0]?.id ?? null,
          proxima_em: proximaEm,
          status: "ativa",
        })
        .eq("id", ativa.id)
        .eq("organizacao_id", orgId)
    : await supabase.from("lead_cadencia").insert({
        organizacao_id: orgId,
        lead_pipeline_id: leadPipelineId,
        company_id: companyId,
        cadencia_id: cadenciaId,
        etapa_atual_id: passos[0]?.id ?? null,
        proxima_em: proximaEm,
        status: "ativa",
      });

  if (erroVinculo) {
    return { ok: false, erro: "Não foi possível vincular a cadência.", status: 500 };
  }

  // Cancela programadas anteriores do lead antes de regenerar (idempotente).
  const { data: antigas } = await supabase
    .from("pipeline_historico")
    .select("id, dados")
    .eq("company_id", companyId)
    .eq("organizacao_id", orgId)
    .eq("tipo_evento", "atividade_programada");
  for (const a of antigas ?? []) {
    const dados = (a.dados as Record<string, unknown>) ?? {};
    if (dados.cancelada === true) continue;
    await supabase
      .from("pipeline_historico")
      .update({ dados: { ...dados, cancelada: true } })
      .eq("id", a.id)
      .eq("organizacao_id", orgId);
  }

  // Gera as atividades programadas (data/hora futura calculada pelas etapas).
  let base = Date.now();
  const programadas = passos.map((p) => {
    base += (p.atraso_dias ?? 0) * 86400000;
    return {
      organizacao_id: orgId,
      lead_pipeline_id: leadPipelineId,
      company_id: companyId,
      usuario_id: usuarioId,
      tipo_evento: "atividade_programada",
      dados: {
        tipo_atividade: p.tipo_atividade,
        titulo: p.titulo,
        observacao: p.script,
        data_hora_atividade: new Date(base).toISOString(),
        etapa_id: p.id,
        cancelada: false,
      },
    };
  });

  if (programadas.length > 0) {
    await supabase.from("pipeline_historico").insert(programadas);
  }

  // Registra o evento de início da cadência.
  await supabase.from("pipeline_historico").insert({
    organizacao_id: orgId,
    lead_pipeline_id: leadPipelineId,
    company_id: companyId,
    usuario_id: usuarioId,
    tipo_evento: "cadencia_iniciada",
    dados: { cadencia_id: cadenciaId, nome: cadencia.nome },
  });

  return { ok: true, nome: cadencia.nome as string, totalEtapas: passos.length };
}

/**
 * Atualiza o andamento da cadência do lead depois que uma atividade
 * programada é concluída, reaberta ou editada: aponta para a próxima etapa
 * pendente ou marca a cadência como "concluida" quando não sobra nenhuma.
 */
export async function sincronizarProgressoCadencia(
  supabase: SupabaseClient,
  orgId: string,
  leadPipelineId: string
): Promise<void> {
  const { data: vinculo } = await supabase
    .from("lead_cadencia")
    .select("id, company_id, status")
    .eq("organizacao_id", orgId)
    .eq("lead_pipeline_id", leadPipelineId)
    .maybeSingle();
  if (!vinculo) return;

  const { data: programadas } = await supabase
    .from("pipeline_historico")
    .select("dados")
    .eq("organizacao_id", orgId)
    .eq("company_id", vinculo.company_id)
    .eq("tipo_evento", "atividade_programada");

  const pendentes = (programadas ?? [])
    .map((p) => (p.dados as Record<string, unknown>) ?? {})
    .filter((d) => d.etapa_id && d.cancelada !== true && d.concluida !== true)
    .sort((a, b) =>
      String(a.data_hora_atividade ?? "").localeCompare(String(b.data_hora_atividade ?? ""))
    );

  const proxima = pendentes[0];
  await supabase
    .from("lead_cadencia")
    .update(
      proxima
        ? {
            status: "ativa",
            etapa_atual_id: proxima.etapa_id as string,
            proxima_em: (proxima.data_hora_atividade as string) ?? null,
            atualizado_em: new Date().toISOString(),
          }
        : {
            status: "concluida",
            etapa_atual_id: null,
            proxima_em: null,
            atualizado_em: new Date().toISOString(),
          }
    )
    .eq("id", vinculo.id)
    .eq("organizacao_id", orgId);
}
