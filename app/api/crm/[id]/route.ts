import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, orgId, usuarioId } = ctx!;
  const { id } = await params;

  let body: {
    stage_id?: string;
    responsavel_id?: string | null;
    ordenacao?: number;
    stage_origem_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const { data: lead, error: erroLead } = await supabase
    .from("lead_pipeline")
    .select("id, company_id, stage_id, responsavel_id, organizacao_id, ordenacao")
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .single();

  if (erroLead || !lead) {
    return NextResponse.json(
      { erro: "Lead do pipeline não encontrado nesta organização." },
      { status: 404 }
    );
  }

  const atualizacao: {
    stage_id?: string;
    responsavel_id?: string | null;
    ordenacao?: number;
  } = {};

  const mudouStage =
    body.stage_id !== undefined && body.stage_id !== lead.stage_id;
  const mudouResponsavel =
    body.responsavel_id !== undefined &&
    (body.responsavel_id ?? null) !== (lead.responsavel_id ?? null);
  const mudouOrdenacao =
    body.ordenacao !== undefined && body.ordenacao !== lead.ordenacao;

  if (mudouStage) {
    // Valida que o estágio de destino pertence à org
    if (!body.stage_id) {
      return NextResponse.json(
        { erro: "stage_id inválido." },
        { status: 400 }
      );
    }
    const { data: estagioDestino } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("id", body.stage_id)
      .eq("organizacao_id", orgId)
      .maybeSingle();
    if (!estagioDestino) {
      return NextResponse.json(
        { erro: "Estágio não encontrado nesta organização." },
        { status: 400 }
      );
    }
    atualizacao.stage_id = body.stage_id;
  }

  if (mudouResponsavel) {
    atualizacao.responsavel_id =
      body.responsavel_id === null || body.responsavel_id === ""
        ? null
        : body.responsavel_id;
  }

  if (mudouOrdenacao && typeof body.ordenacao === "number") {
    atualizacao.ordenacao = body.ordenacao;
  }

  if (Object.keys(atualizacao).length === 0) {
    return NextResponse.json({ lead }, { status: 200 });
  }

  const stageOrigemId = mudouStage ? lead.stage_id : null;

  const { data: atualizado, error: erroUpdate } = await supabase
    .from("lead_pipeline")
    .update(atualizacao)
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select("id, company_id, stage_id, responsavel_id, ordenacao, atualizado_em")
    .single();

  if (erroUpdate || !atualizado) {
    return NextResponse.json(
      { erro: "Não foi possível atualizar o lead.", detalhe: erroUpdate?.message },
      { status: 500 }
    );
  }

  // Registra histórico
  const eventos: Array<Record<string, unknown>> = [];
  if (mudouStage) {
    eventos.push({
      tipo_evento: "mudanca_estagio",
      stage_origem_id: stageOrigemId,
      stage_destino_id: atualizacao.stage_id,
      dados: {},
    });
  }
  if (mudouResponsavel) {
    eventos.push({
      tipo_evento: "responsavel_definido",
      dados: {
        responsavel_id: atualizacao.responsavel_id ?? null,
        anterior_id: lead.responsavel_id ?? null,
      },
    });
  }

  if (eventos.length > 0) {
    await supabase.from("pipeline_historico").insert(
      eventos.map((e) => ({
        organizacao_id: orgId,
        lead_pipeline_id: id,
        company_id: lead.company_id,
        usuario_id: usuarioId,
        tipo_evento: e.tipo_evento as string,
        stage_origem_id: (e.stage_origem_id as string) ?? null,
        stage_destino_id: (e.stage_destino_id as string) ?? null,
        dados: (e.dados as Record<string, unknown>) ?? {},
      }))
    );
  }

  return NextResponse.json({ lead: atualizado });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, orgId, usuarioId } = ctx!;
  const { id } = await params;

  const { data: lead, error: erroLead } = await supabase
    .from("lead_pipeline")
    .select("id, company_id, stage_id")
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .single();

  if (erroLead || !lead) {
    return NextResponse.json(
      { erro: "Lead do pipeline não encontrado nesta organização." },
      { status: 404 }
    );
  }

  const { error: erroDelete } = await supabase
    .from("lead_pipeline")
    .delete()
    .eq("id", id)
    .eq("organizacao_id", orgId);

  if (erroDelete) {
    return NextResponse.json(
      { erro: "Não foi possível remover do pipeline.", detalhe: erroDelete.message },
      { status: 500 }
    );
  }

  await supabase.from("pipeline_historico").insert({
    organizacao_id: orgId,
    lead_pipeline_id: id,
    company_id: lead.company_id,
    usuario_id: usuarioId,
    tipo_evento: "lead_removido",
    stage_origem_id: lead.stage_id,
    dados: {},
  });

  return NextResponse.json({ ok: true });
}
