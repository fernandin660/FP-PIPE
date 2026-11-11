import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { iniciarCadenciaLead } from "../../../../lib/crm-cadencia";
import { cancelarProgramadasPendentes } from "../../../../lib/crm";

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
    .select("id, company_id, stage_id")
    .eq("organizacao_id", orgId)
    .in("id", leadIds);

  const validosSet = new Set((leadsValidos ?? []).map((l) => l.id));
  const infoLead = new Map<string, { company_id: string; stage_id: string }>();
  for (const l of (leadsValidos ?? []) as Array<{ id: string; company_id: string; stage_id: string }>) {
    infoLead.set(l.id, { company_id: l.company_id, stage_id: l.stage_id });
  }
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

    const { data: stagesValidos } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("organizacao_id", orgId)
      .in("id", [...porStage.keys()]);
    const stagesSet = new Set((stagesValidos ?? []).map((st) => st.id));

    for (const [stageId, ops] of porStage) {
      if (!stagesSet.has(stageId)) {
        for (const op of ops) {
          resultados.push({ operacao: op, sucesso: false, erro: "Estágio inválido." });
        }
        continue;
      }
      // Busca ordenação atual do stage para calcular novas posições
      const { count } = await supabase
        .from("lead_pipeline")
        .select("id", { count: "exact", head: true })
        .eq("organizacao_id", orgId)
        .eq("stage_id", stageId);
      const ordenacaoBase = count ?? 0;

      // Atualiza cada lead (sempre restrito à org).
      let erroUpdate: { message: string } | null = null;
      const agora = new Date().toISOString();
      for (const [i, op] of ops.entries()) {
        const { error } = await admin
          .from("lead_pipeline")
          .update({ stage_id: stageId, ordenacao: ordenacaoBase + i, atualizado_em: agora })
          .eq("id", op.leadId)
          .eq("organizacao_id", orgId);
        if (error) {
          erroUpdate = error;
          break;
        }
      }

      if (erroUpdate) {
        for (const op of ops) {
          resultados.push({
            operacao: op,
            sucesso: false,
            erro: erroUpdate.message,
          });
        }
      } else {
        // Histórico: só de quem realmente mudou de estágio.
        const historico = ops
          .filter((op) => infoLead.get(op.leadId)?.stage_id !== op.stageId)
          .map((op) => ({
            organizacao_id: orgId,
            lead_pipeline_id: op.leadId,
            company_id: infoLead.get(op.leadId)!.company_id,
            usuario_id: usuarioId,
            tipo_evento: "mudanca_estagio",
            stage_origem_id: infoLead.get(op.leadId)!.stage_id,
            stage_destino_id: op.stageId,
            dados: { em_lote: true },
          }));
        if (historico.length > 0) {
          await admin.from("pipeline_historico").insert(historico);
        }

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
      // Cancela a cadência pendente e registra a saída (o lead não existe
      // mais, então lead_pipeline_id fica nulo).
      const empresasRemovidas = excluirOps
        .map((op) => companyIdPorLead.get(op.leadId))
        .filter((c): c is string => Boolean(c));
      await cancelarProgramadasPendentes(supabase, orgId, empresasRemovidas);
      const historico = excluirOps
        .filter((op) => companyIdPorLead.has(op.leadId))
        .map((op) => ({
          organizacao_id: orgId,
          lead_pipeline_id: null,
          company_id: companyIdPorLead.get(op.leadId)!,
          usuario_id: usuarioId,
          tipo_evento: "lead_removido",
          stage_origem_id: infoLead.get(op.leadId)?.stage_id ?? null,
          dados: { em_lote: true },
        }));
      if (historico.length > 0) {
        await admin.from("pipeline_historico").insert(historico);
      }

      for (const op of excluirOps) {
        resultados.push({ operacao: op, sucesso: true });
      }
    }
  }

  // --- CADÊNCIA em batch ---
  if (cadenciaOps.length > 0) {
    // company_id de cada lead (necessário para o vínculo e o histórico).
    const { data: leadsCadencia } = await supabase
      .from("lead_pipeline")
      .select("id, company_id")
      .eq("organizacao_id", orgId)
      .in(
        "id",
        cadenciaOps.map((op) => op.leadPipelineId)
      );
    const companyPorLead = new Map<string, string>();
    for (const l of (leadsCadencia ?? []) as Array<{ id: string; company_id: string }>) {
      companyPorLead.set(l.id, l.company_id);
    }

    for (const op of cadenciaOps) {
      const companyId = companyPorLead.get(op.leadPipelineId);
      if (!companyId) {
        resultados.push({ operacao: op, sucesso: false, erro: "Lead não encontrado." });
        continue;
      }
      const r = await iniciarCadenciaLead(supabase, {
        orgId,
        usuarioId,
        leadPipelineId: op.leadPipelineId,
        companyId,
        cadenciaId: op.cadenciaId,
      });
      resultados.push(
        r.ok ? { operacao: op, sucesso: true } : { operacao: op, sucesso: false, erro: r.erro }
      );
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