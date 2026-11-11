import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { cancelarProgramadasPendentes, ehMembroAtivo } from "../../../../lib/crm";
import { ehEstagioPerdido } from "../../../../lib/crm-previsao";
import { validarCampos } from "../../../../lib/crm-campos";

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
    valor_oportunidade?: number | null;
    produto?: string | null;
    motivo_perda?: string | null;
    titulo?: string | null;
    pessoa_id?: string | null;
    data_prevista?: string | null;
    campos?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const { data: lead, error: erroLead } = await supabase
    .from("lead_pipeline")
    .select(
      "id, company_id, stage_id, responsavel_id, organizacao_id, ordenacao, valor_oportunidade, produto"
    )
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
    alerta?: string | null;
    alerta_em?: string | null;
    stage_id?: string;
    responsavel_id?: string | null;
    ordenacao?: number;
    valor_oportunidade?: number | null;
    produto?: string | null;
    motivo_perda?: string | null;
    titulo?: string | null;
    pessoa_id?: string | null;
    data_prevista?: string | null;
    campos?: Record<string, unknown>;
  } = {};

  const mudouStage =
    body.stage_id !== undefined && body.stage_id !== lead.stage_id;
  const mudouResponsavel =
    body.responsavel_id !== undefined &&
    (body.responsavel_id ?? null) !== (lead.responsavel_id ?? null);
  const mudouOrdenacao =
    body.ordenacao !== undefined && body.ordenacao !== lead.ordenacao;

  const normalizarValor = (v: unknown): number | null | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const mudaValor = body.valor_oportunidade !== undefined;
  const novoValor = normalizarValor(body.valor_oportunidade);
  const mudouValor =
    mudaValor && (novoValor ?? null) !== (lead.valor_oportunidade ?? null);
  if (mudouValor) atualizacao.valor_oportunidade = novoValor ?? null;

  const mudaProduto = body.produto !== undefined;
  const novoProduto =
    typeof body.produto === "string" ? body.produto.trim() : null;
  const mudouProduto =
    mudaProduto && (novoProduto ?? null) !== (lead.produto ?? null);
  if (mudouProduto) atualizacao.produto = novoProduto === "" ? null : novoProduto;

  if (body.titulo !== undefined) {
    atualizacao.titulo =
      typeof body.titulo === "string" ? body.titulo.trim().slice(0, 160) || null : null;
  }
  if (body.data_prevista !== undefined) {
    atualizacao.data_prevista =
      typeof body.data_prevista === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.data_prevista)
        ? body.data_prevista
        : null;
  }
  if (body.pessoa_id !== undefined) {
    if (body.pessoa_id) {
      const { data: pessoa } = await supabase
        .from("contatos")
        .select("id")
        .eq("id", body.pessoa_id)
        .eq("organizacao_id", orgId)
        .maybeSingle();
      if (!pessoa) {
        return NextResponse.json({ erro: "Pessoa não encontrada nesta organização." }, { status: 400 });
      }
      atualizacao.pessoa_id = pessoa.id;
    } else {
      atualizacao.pessoa_id = null;
    }
  }
  if (body.campos !== undefined) {
    const limpos = await validarCampos(supabase, orgId, "negocio", body.campos);
    if (!limpos.ok) return NextResponse.json({ erro: limpos.erro }, { status: 400 });
    atualizacao.campos = limpos.valores;
  }

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
      .select("id, nome")
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
    // Perdido guarda o motivo; sair de Perdido limpa o motivo antigo.
    const motivo =
      typeof body.motivo_perda === "string" ? body.motivo_perda.trim().slice(0, 300) : "";
    atualizacao.motivo_perda = ehEstagioPerdido(estagioDestino.nome) ? motivo || null : null;
  }

  if (mudouResponsavel) {
    const novoResp =
      body.responsavel_id === null || body.responsavel_id === ""
        ? null
        : body.responsavel_id;
    // O responsável precisa ser membro ativo desta organização.
    if (novoResp && !(await ehMembroAtivo(supabase, orgId, novoResp))) {
      return NextResponse.json(
        { erro: "Responsável não faz parte desta organização." },
        { status: 400 }
      );
    }
    atualizacao.responsavel_id = novoResp;
  }

  if (mudouOrdenacao && typeof body.ordenacao === "number") {
    atualizacao.ordenacao = body.ordenacao;
  }

  if (Object.keys(atualizacao).length === 0) {
    return NextResponse.json({ lead }, { status: 200 });
  }

  const stageOrigemId = mudouStage ? lead.stage_id : null;
  // Mudou de etapa: alguém já está tratando o negócio, o alerta sai do card.
  if (mudouStage) {
    atualizacao.alerta = null;
    atualizacao.alerta_em = null;
  }

  const { data: atualizado, error: erroUpdate } = await supabase
    .from("lead_pipeline")
    .update(atualizacao)
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select(
      "id, company_id, stage_id, responsavel_id, ordenacao, valor_oportunidade, produto, motivo_perda, atualizado_em"
    )
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
      dados: atualizacao.motivo_perda ? { motivo_perda: atualizacao.motivo_perda } : {},
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
  if (mudouValor || mudouProduto) {
    eventos.push({
      tipo_evento: "oportunidade_atualizada",
      dados: {
        valor: atualizado.valor_oportunidade ?? null,
        produto: atualizado.produto ?? null,
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

  // O lead saiu do funil: cancela a cadência pendente e registra a saída.
  // (lead_pipeline_id fica nulo: o lead não existe mais; o histórico
  // continua ligado à empresa.)
  await cancelarProgramadasPendentes(supabase, orgId, [lead.company_id]);
  await supabase.from("pipeline_historico").insert({
    organizacao_id: orgId,
    lead_pipeline_id: null,
    company_id: lead.company_id,
    usuario_id: usuarioId,
    tipo_evento: "lead_removido",
    stage_origem_id: lead.stage_id,
    dados: {},
  });

  return NextResponse.json({ ok: true });
}
