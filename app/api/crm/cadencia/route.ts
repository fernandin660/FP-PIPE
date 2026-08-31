import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Cadências: modelos de follow-up por organização.
 *
 * GET  /api/crm/cadencia?lead_pipeline_id=...
 *   Lista os modelos de cadência (com etapas) da org. Se informado um
 *   lead_pipeline_id, também devolve a cadência ativa desse lead.
 *
 * POST /api/crm/cadencia/entrar  { company_id, cadencia_id }
 *   Coloca o lead numa cadência: cria o vínculo, agenda todas as etapas
 *   como atividades programadas no histórico (data/hora futura) e
 *   registra o evento "cadencia_iniciada".
 *
 * POST /api/crm/cadencia/sair  { company_id }
 *   Remove a cadência ativa do lead e cancela as atividades programadas
 *   pendentes do tipo "atividade_programada".
 */
export async function GET(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId } = ctx!;

    const url = new URL(request.url);
    const leadPipelineId = url.searchParams.get("lead_pipeline_id");

    const { data: cadencias, error: erroCad } = await supabase
      .from("cadencia")
      .select("id, nome, descricao, criado_em")
      .eq("organizacao_id", orgId)
      .order("criado_em", { ascending: true });

    if (erroCad) {
      return NextResponse.json(
        { erro: "Não foi possível listar as cadências." },
        { status: 500 }
      );
    }

    const semEtapas = (cadencias ?? []).map((c) => ({ ...c, etapas: [] }));

    if (semEtapas.length === 0) {
      return NextResponse.json({ cadencias: semEtapas, cadenciaAtiva: null });
    }

    const { data: etapas } = await supabase
      .from("cadencia_etapas")
      .select("id, cadencia_id, ordem, tipo_atividade, titulo, atraso_dias, script")
      .in(
        "cadencia_id",
        semEtapas.map((c) => c.id)
      )
      .order("ordem", { ascending: true });

    const cadenciasComEtapas = semEtapas.map((c) => ({
      ...c,
      etapas: (etapas ?? []).filter((e) => e.cadencia_id === c.id),
    }));

    let cadenciaAtiva = null;
    if (leadPipelineId) {
      const { data: ativa } = await supabase
        .from("lead_cadencia")
        .select("id, cadencia_id, etapa_atual_id, proxima_em, status")
        .eq("organizacao_id", orgId)
        .eq("lead_pipeline_id", leadPipelineId)
        .maybeSingle();
      if (ativa) cadenciaAtiva = ativa;
    }

    return NextResponse.json({
      cadencias: cadenciasComEtapas,
      cadenciaAtiva,
    });
  } catch (erro) {
    console.error("Erro ao listar cadências:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos carregar as cadências." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId, usuarioId } = ctx!;

    const url = new URL(request.url);
    const acao = url.searchParams.get("acao") ?? "entrar";

    let body: { company_id?: unknown; cadencia_id?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const companyId = texto(body.company_id);
    if (!companyId) {
      return NextResponse.json(
        { erro: "company_id é obrigatório." },
        { status: 400 }
      );
    }

    const { data: lead } = await supabase
      .from("lead_pipeline")
      .select("id")
      .eq("organizacao_id", orgId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!lead) {
      return NextResponse.json(
        { erro: "Lead não encontrado nesta organização." },
        { status: 404 }
      );
    }
    const leadPipelineId = lead.id;

    if (acao === "sair") {
      const { data: ativa } = await supabase
        .from("lead_cadencia")
        .select("id")
        .eq("organizacao_id", orgId)
        .eq("lead_pipeline_id", leadPipelineId)
        .maybeSingle();

      if (ativa) {
        const { error: erroDel } = await supabase
          .from("lead_cadencia")
          .delete()
          .eq("id", ativa.id)
          .eq("organizacao_id", orgId);
        if (erroDel) {
          return NextResponse.json(
            { erro: "Não foi possível sair da cadência." },
            { status: 500 }
          );
        }
      }

      // Cancela atividades programadas pendentes deste lead (preservando dados).
      const { data: programadas } = await supabase
        .from("pipeline_historico")
        .select("id, dados")
        .eq("company_id", companyId)
        .eq("organizacao_id", orgId)
        .eq("tipo_evento", "atividade_programada");

      for (const p of programadas ?? []) {
        const dados = (p.dados as Record<string, unknown>) ?? {};
        if (dados.cancelada === true) continue;
        await supabase
          .from("pipeline_historico")
          .update({ dados: { ...dados, cancelada: true } })
          .eq("id", p.id)
          .eq("organizacao_id", orgId);
      }

      return NextResponse.json({ ok: true });
    }

    // "entrar"
    const cadenciaId = texto(body.cadencia_id);
    if (!cadenciaId) {
      return NextResponse.json(
        { erro: "Cadência não informada." },
        { status: 400 }
      );
    }

    const { data: cadencia } = await supabase
      .from("cadencia")
      .select("id, nome")
      .eq("id", cadenciaId)
      .eq("organizacao_id", orgId)
      .maybeSingle();

    if (!cadencia) {
      return NextResponse.json(
        { erro: "Cadência não encontrada nesta organização." },
        { status: 404 }
      );
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
      ? new Date(
          Date.now() + (passos[0].atraso_dias ?? 0) * 86400000
        ).toISOString()
      : null;

    if (ativa) {
      await supabase
        .from("lead_cadencia")
        .update({
          cadencia_id: cadenciaId,
          etapa_atual_id: passos[0]?.id ?? null,
          proxima_em: proximaEm,
          status: "ativa",
        })
        .eq("id", ativa.id)
        .eq("organizacao_id", orgId);
    } else {
      await supabase.from("lead_cadencia").insert({
        organizacao_id: orgId,
        lead_pipeline_id: leadPipelineId,
        company_id: companyId,
        cadencia_id: cadenciaId,
        etapa_atual_id: passos[0]?.id ?? null,
        proxima_em: proximaEm,
        status: "ativa",
      });
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

    return NextResponse.json({ ok: true, nome: cadencia.nome, totalEtapas: passos.length });
  } catch (erro) {
    console.error("Erro ao aplicar cadência:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos aplicar a cadência." },
      { status: 500 }
    );
  }
}
