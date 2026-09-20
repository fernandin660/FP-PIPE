import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

type OperacaoMover = {
  tipo: "mover";
  leadId: string;
  stageId: string;
  ordenacao: number;
};

type OperacaoExcluir = {
  tipo: "excluir";
  leadId: string;
};

type OperacaoCadencia = {
  tipo: "cadencia";
  leadPipelineId: string;
  cadenciaId: string;
};

type OperacaoBatch = OperacaoMover | OperacaoExcluir | OperacaoCadencia;

export async function POST(request: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, orgId, usuarioId } = ctx!;

  let body: { operacoes: OperacaoBatch[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const { operacoes } = body;
  if (!Array.isArray(operacoes) || operacoes.length === 0) {
    return NextResponse.json(
      { erro: "Array 'operacoes' é obrigatório e não pode ser vazio." },
      { status: 400 }
    );
  }

  if (operacoes.length > 200) {
    return NextResponse.json(
      { erro: "Máximo 200 operações por requisição." },
      { status: 400 }
    );
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço indisponível." },
      { status: 503 }
    );
  }

  // Valida se todos os leads pertencem à org
  const leadIds = operacoes.map((op) =>
    op.tipo === "cadencia" ? op.leadPipelineId : op.leadId
  );
  const { data: leadsValidos } = await supabase
    .from("lead_pipeline")
    .select("id")
    .eq("organizacao_id", orgId)
    .in("id", leadIds);

  const validosSet = new Set((leadsValidos ?? []).map((l) => l.id));
  const operacoesValidas = operacoes.filter((op) => {
    const id = op.tipo === "cadencia" ? op.leadPipelineId : op.leadId;
    return validosSet.has(id);
  });

  if (operacoesValidas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma operação válida encontrada para esta organização." },
      { status: 400 }
    );
  }

  const resultados: Array<{
    operacao: OperacaoBatch;
    sucesso: boolean;
    erro?: string;
  }> = [];

  // Agrupa por tipo para otimizar
  const moverOps = operacoesValidas.filter((o) => o.tipo === "mover");
  const excluirOps = operacoesValidas.filter((o) => o.tipo === "excluir");
  const cadenciaOps = operacoesValidas.filter((o) => o.tipo === "cadencia");

  // --- MOVER em batch ---
  if (moverOps.length > 0) {
    // Agrupa por stage_id para otimizar ordenação
    const porStage = new Map<string, typeof moverOps>();
    for (const op of moverOps) {
      const arr = porStage.get(op.stageId) ?? [];
      arr.push(op);
      porStage.set(op.stageId, arr);
    }

    for (const [stageId, ops] of porStage) {
      // Busca ordenação atual do stage para calcular novas posições
      const { count } = await supabase
        .from("lead_pipeline")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", stageId);
      let ordenacaoBase = count ?? 0;

      // Prepara updates em batch
      const updates = ops.map((op, i) => ({
        id: op.leadId,
        stage_id: stageId,
        ordenacao: ordenacaoBase + i,
        atualizado_em: new Date().toISOString(),
      }));

      // Batch update usando upsert
      const { error: erroUpdate } = await admin
        .from("lead_pipeline")
        .upsert(updates, { onConflict: "id" });

      if (erroUpdate) {
        for (const op of ops) {
          resultados.push({
            operacao: op,
            sucesso: false,
            erro: erroUpdate.message,
          });
        }
      } else {
        // Insere histórico para cada movido
        const historico = ops.map((op) => ({
          organizacao_id: orgId,
          lead_pipeline_id: op.leadId,
          company_id: null, // será preenchido pelo trigger ou buscado
          usuario_id: usuarioId,
          tipo_evento: "mudanca_estagio",
          stage_destino_id: op.stageId,
          dados: { ordenacao: op.ordenacao },
        }));
        await admin.from("pipeline_historico").insert(historico);

        for (const op of ops) {
          resultados.push({ operacao: op, sucesso: true });
        }
      }
    }
  }

  // --- EXCLUIR em batch ---
  if (excluirOps.length > 0) {
    const idsParaExcluir = excluirOps.map((op) => op.leadId);

    // Busca company_ids antes de excluir para histórico
    const { data: leadsParaExcluir } = await supabase
      .from("lead_pipeline")
      .select("id, company_id")
      .eq("organizacao_id", orgId)
      .in("id", idsParaExcluir);

    const companyIdPorLead = new Map<string, string>();
    for (const l of (leadsParaExcluir ?? []) as Array<{ id: string; company_id: string }>) {
      companyIdPorLead.set(l.id, l.company_id);
    }

    const { error: erroDelete } = await admin
      .from("lead_pipeline")
      .delete()
      .eq("organizacao_id", orgId)
      .in("id", idsParaExcluir);

    if (erroDelete) {
      for (const op of excluirOps) {
        resultados.push({
          operacao: op,
          sucesso: false,
          erro: erroDelete.message,
        });
      }
    } else {
      // Insere histórico
      const historico = excluirOps.map((op) => ({
        organizacao_id: orgId,
        lead_pipeline_id: op.leadId,
        company_id: companyIdPorLead.get(op.leadId) ?? null,
        usuario_id: usuarioId,
        tipo_evento: "lead_removido",
        dados: {},
      }));
      await admin.from("pipeline_historico").insert(historico);

      for (const op of excluirOps) {
        resultados.push({ operacao: op, sucesso: true });
      }
    }
  }

  // --- CADÊNCIA em batch ---
  if (cadenciaOps.length > 0) {
    // Valida cadências
    const cadenciaIds = [...new Set(cadenciaOps.map((op) => op.cadenciaId))];
    const { data: cadenciasValidas } = await supabase
      .from("cadencia_modelos")
      .select("id")
      .eq("organizacao_id", orgId)
      .in("id", cadenciaIds);
    const validasSet = new Set((cadenciasValidas ?? []).map((c) => c.id));

    for (const op of cadenciaOps) {
      if (!validasSet.has(op.cadenciaId)) {
        resultados.push({
          operacao: op,
          sucesso: false,
          erro: "Cadência inválida ou não pertence à organização.",
        });
        continue;
      }

      const { error: erroCadencia } = await admin
        .from("cadencia_execucoes")
        .insert({
          organizacao_id: orgId,
          cadencia_modelo_id: op.cadenciaId,
          lead_pipeline_id: op.leadPipelineId,
          usuario_id: usuarioId,
          status: "ativa",
          etapa_atual: 0,
        });

      if (erroCadencia) {
        resultados.push({
          operacao: op,
          sucesso: false,
          erro: erroCadencia.message,
        });
      } else {
        // Histórico
        await admin.from("pipeline_historico").insert({
          organizacao_id: orgId,
          lead_pipeline_id: op.leadPipelineId,
          company_id: null,
          usuario_id: usuarioId,
          tipo_evento: "cadencia_iniciada",
          dados: { cadencia_id: op.cadenciaId },
        });
        resultados.push({ operacao: op, sucesso: true });
      }
    }
  }

  const sucessos = resultados.filter((r) => r.sucesso).length;
  const falhas = resultados.length - sucessos;

  return NextResponse.json({
    ok: falhas === 0,
    total: resultados.length,
    sucessos,
    falhas,
    resultados,
  });
}