import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { iniciarCadenciaLead } from "../../../../lib/crm-cadencia";
import { cancelarProgramadasPendentes } from "../../../../lib/crm";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

type EtapaEntrada = {
  tipo_atividade?: unknown;
  titulo?: unknown;
  atraso_dias?: unknown;
  script?: unknown;
};

const TIPOS_ETAPA = new Set(["email", "telefone", "whatsapp", "linkedin", "reuniao", "tarefa"]);

function montarEtapas(cadenciaId: string, etapas: unknown[]) {
  return etapas.slice(0, 30).map((et, i) => {
    const e = (et ?? {}) as EtapaEntrada;
    const tipo = texto(e.tipo_atividade);
    const atraso = Number(e.atraso_dias);
    return {
      cadencia_id: cadenciaId,
      ordem: i,
      tipo_atividade: TIPOS_ETAPA.has(tipo) ? tipo : "tarefa",
      titulo: texto(e.titulo).slice(0, 200) || `Etapa ${i + 1}`,
      atraso_dias: Number.isFinite(atraso) ? Math.min(365, Math.max(0, Math.round(atraso))) : 0,
      script: texto(e.script).slice(0, 4000),
    };
  });
}

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

    let listaCadencias = cadencias ?? [];

    // Organização nova, ainda sem modelos: cria os modelos padrão.
    if (listaCadencias.length === 0) {
      const admin = criarClienteSupabaseAdmin();
      if (admin) {
        await admin.rpc("_crm_seed_cadencia_padrao", { org_id: orgId });
        await admin.rpc("_crm_seed_cadencia_extra", { org_id: orgId });
        const { data: semeadas } = await supabase
          .from("cadencia")
          .select("id, nome, descricao, criado_em")
          .eq("organizacao_id", orgId)
          .order("criado_em", { ascending: true });
        listaCadencias = semeadas ?? [];
      }
    }

    const semEtapas = listaCadencias.map((c) => ({ ...c, etapas: [] }));

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

    let body: {
      company_id?: unknown;
      cadencia_id?: unknown;
      nome?: unknown;
      descricao?: unknown;
      etapas?: unknown[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    // ---- Ações sobre MODELOS (não dependem de um lead) ----
    // "criar": cria um novo modelo de cadência com suas etapas.
    if (acao === "criar") {
      const nome = texto(body.nome);
      const descricao = texto(body.descricao);
      const etapas = Array.isArray(body.etapas) ? body.etapas : [];
      if (!nome) {
        return NextResponse.json(
          { erro: "Nome da cadência é obrigatório." },
          { status: 400 }
        );
      }
      if (etapas.length === 0) {
        return NextResponse.json(
          { erro: "A cadência precisa de pelo menos uma etapa." },
          { status: 400 }
        );
      }

      const { data: novaCadencia, error: erroCriar } = await supabase
        .from("cadencia")
        .insert({
          organizacao_id: orgId,
          nome,
          descricao,
          criado_por: usuarioId,
        })
        .select("id, nome, descricao, criado_em")
        .single();

      if (erroCriar || !novaCadencia) {
        if ((erroCriar?.message ?? "").toLowerCase().includes("duplicate")) {
          return NextResponse.json(
            { erro: "Já existe uma cadência com esse nome." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { erro: "Não foi possível criar a cadência." },
          { status: 500 }
        );
      }

      const { error: erroEtapas } = await supabase
        .from("cadencia_etapas")
        .insert(montarEtapas(novaCadencia.id, etapas));
      if (erroEtapas) {
        // Não deixa um modelo vazio para trás.
        await supabase.from("cadencia").delete().eq("id", novaCadencia.id).eq("organizacao_id", orgId);
        return NextResponse.json(
          { erro: "Não foi possível salvar as etapas da cadência." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, id: novaCadencia.id });
    }

    // "atualizar": edita um modelo existente (reecria as etapas).
    if (acao === "atualizar") {
      const cadenciaId = texto(body.cadencia_id);
      const nome = texto(body.nome);
      const descricao = texto(body.descricao);
      const etapas = Array.isArray(body.etapas) ? body.etapas : [];
      if (!cadenciaId) {
        return NextResponse.json(
          { erro: "Cadência não informada." },
          { status: 400 }
        );
      }
      if (!nome) {
        return NextResponse.json(
          { erro: "Nome da cadência é obrigatório." },
          { status: 400 }
        );
      }
      if (etapas.length === 0) {
        return NextResponse.json(
          { erro: "A cadência precisa de pelo menos uma etapa." },
          { status: 400 }
        );
      }

      // Confirma que o modelo é desta organização antes de mexer nas etapas.
      const { data: existente } = await supabase
        .from("cadencia")
        .select("id")
        .eq("id", cadenciaId)
        .eq("organizacao_id", orgId)
        .maybeSingle();
      if (!existente) {
        return NextResponse.json(
          { erro: "Cadência não encontrada nesta organização." },
          { status: 404 }
        );
      }

      const { error: erroUpd } = await supabase
        .from("cadencia")
        .update({ nome, descricao })
        .eq("id", cadenciaId)
        .eq("organizacao_id", orgId);

      if (erroUpd) {
        if ((erroUpd.message ?? "").toLowerCase().includes("duplicate")) {
          return NextResponse.json(
            { erro: "Já existe uma cadência com esse nome." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { erro: "Não foi possível atualizar a cadência." },
          { status: 500 }
        );
      }

      // Remove as etapas antigas e insere as novas (reescrita simples).
      await supabase
        .from("cadencia_etapas")
        .delete()
        .eq("cadencia_id", cadenciaId);

      const { error: erroEtapas } = await supabase
        .from("cadencia_etapas")
        .insert(montarEtapas(cadenciaId, etapas));
      if (erroEtapas) {
        return NextResponse.json(
          { erro: "Não foi possível salvar as etapas da cadência." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // "excluir": remove um modelo de cadência (cascata nas etapas e vínculos).
    if (acao === "excluir") {
      const cadenciaId = texto(body.cadencia_id);
      if (!cadenciaId) {
        return NextResponse.json(
          { erro: "Cadência não informada." },
          { status: 400 }
        );
      }

      // Sair dos leads que estão usando este modelo para não deixar órfãos.
      const { data: vinculados } = await supabase
        .from("lead_cadencia")
        .select("id, company_id")
        .eq("organizacao_id", orgId)
        .eq("cadencia_id", cadenciaId);

      // As atividades já agendadas por este modelo deixam de valer.
      await cancelarProgramadasPendentes(
        supabase,
        orgId,
        (vinculados ?? []).map((v) => v.company_id as string)
      );

      for (const v of vinculados ?? []) {
        await supabase
          .from("lead_cadencia")
          .delete()
          .eq("id", v.id)
          .eq("organizacao_id", orgId);
      }

      const { error: erroDel } = await supabase
        .from("cadencia")
        .delete()
        .eq("id", cadenciaId)
        .eq("organizacao_id", orgId);

      if (erroDel) {
        return NextResponse.json(
          { erro: "Não foi possível excluir a cadência." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ---- Ações sobre um LEAD (entrar / sair) ----
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
      .order("atualizado_em", { ascending: false })
      .limit(1)
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

      await cancelarProgramadasPendentes(supabase, orgId, [companyId]);

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

    const resultado = await iniciarCadenciaLead(supabase, {
      orgId,
      usuarioId,
      leadPipelineId,
      companyId,
      cadenciaId,
    });
    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
    }

    return NextResponse.json({
      ok: true,
      nome: resultado.nome,
      totalEtapas: resultado.totalEtapas,
    });
  } catch (erro) {
    console.error("Erro ao aplicar cadência:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos aplicar a cadência." },
      { status: 500 }
    );
  }
}
