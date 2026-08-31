import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";

const TIPOS_ATIVIDADE = new Set([
  "email",
  "telefone",
  "whatsapp",
  "linkedin",
  "reuniao",
  "tarefa",
  "observacao",
]);

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Atividades manuais no histórico do lead.
 *
 * POST: cria uma atividade manual (tipo, título, observação e data/hora
 *   da atividade). A `data_hora_atividade` fica em `dados` e é editável —
 *   separada de `criado_em`, que registra o momento real da escrita.
 * PATCH: edita os campos da atividade manual.
 * DELETE: remove uma atividade manual.
 */
export async function POST(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId, usuarioId } = ctx!;

    let body: {
      company_id?: unknown;
      tipo_atividade?: unknown;
      titulo?: unknown;
      observacao?: unknown;
      data_hora_atividade?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const companyId = texto(body.company_id);
    const tipoAtividade = texto(body.tipo_atividade);
    const titulo = texto(body.titulo);
    const observacao = texto(body.observacao);
    const dataHoraAtividade = texto(body.data_hora_atividade);

    if (!companyId || !titulo) {
      return NextResponse.json(
        { erro: "company_id e título são obrigatórios." },
        { status: 400 }
      );
    }

    // Valida que a empresa está no pipeline da org.
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

    const dados: Record<string, unknown> = {
      tipo_atividade: TIPOS_ATIVIDADE.has(tipoAtividade) ? tipoAtividade : "observacao",
      titulo,
      observacao,
      data_hora_atividade: dataHoraAtividade || new Date().toISOString(),
    };

    const { data: novo, error: erroInsert } = await supabase
      .from("pipeline_historico")
      .insert({
        organizacao_id: orgId,
        lead_pipeline_id: lead.id,
        company_id: companyId,
        usuario_id: usuarioId,
        tipo_evento: "atividade",
        dados,
      })
      .select("*")
      .single();

    if (erroInsert || !novo) {
      return NextResponse.json(
        { erro: "Não foi possível registrar a atividade.", detalhe: erroInsert?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ atividade: novo }, { status: 201 });
  } catch (erro) {
    console.error("Erro ao criar atividade:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos registrar a atividade." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId } = ctx!;

    let body: {
      atividade_id?: unknown;
      tipo_atividade?: unknown;
      titulo?: unknown;
      observacao?: unknown;
      data_hora_atividade?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const atividadeId = texto(body.atividade_id);
    if (!atividadeId) {
      return NextResponse.json(
        { erro: "atividade_id é obrigatório." },
        { status: 400 }
      );
    }

    const { data: atual } = await supabase
      .from("pipeline_historico")
      .select("id, dados, tipo_evento")
      .eq("id", atividadeId)
      .eq("organizacao_id", orgId)
      .single();

    if (!atual) {
      return NextResponse.json(
        { erro: "Atividade não encontrada nesta organização." },
        { status: 404 }
      );
    }
    if (atual.tipo_evento !== "atividade") {
      return NextResponse.json(
        { erro: "Apenas atividades manuais podem ser editadas." },
        { status: 400 }
      );
    }

    const dadosAtuais =
      (atual.dados as Record<string, unknown>) ?? {};

    const novosDados: Record<string, unknown> = { ...dadosAtuais };

    const titulo = texto(body.titulo);
    const observacao = texto(body.observacao);
    const tipoAtividade = texto(body.tipo_atividade);
    const dataHora = texto(body.data_hora_atividade);

    if (body.titulo !== undefined) novosDados.titulo = titulo;
    if (body.observacao !== undefined) novosDados.observacao = observacao;
    if (body.tipo_atividade !== undefined)
      novosDados.tipo_atividade = TIPOS_ATIVIDADE.has(tipoAtividade)
        ? tipoAtividade
        : "observacao";
    if (body.data_hora_atividade !== undefined)
      novosDados.data_hora_atividade = dataHora;

    const { data: atualizado, error: erroUpdate } = await supabase
      .from("pipeline_historico")
      .update({ dados: novosDados })
      .eq("id", atividadeId)
      .eq("organizacao_id", orgId)
      .select("*")
      .single();

    if (erroUpdate || !atualizado) {
      return NextResponse.json(
        { erro: "Não foi possível editar a atividade.", detalhe: erroUpdate?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ atividade: atualizado });
  } catch (erro) {
    console.error("Erro ao editar atividade:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos editar a atividade." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId } = ctx!;

    let body: { atividade_id?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const atividadeId = texto(body.atividade_id);
    if (!atividadeId) {
      return NextResponse.json(
        { erro: "atividade_id é obrigatório." },
        { status: 400 }
      );
    }

    const { data: atual } = await supabase
      .from("pipeline_historico")
      .select("id, tipo_evento")
      .eq("id", atividadeId)
      .eq("organizacao_id", orgId)
      .single();

    if (!atual || atual.tipo_evento !== "atividade") {
      return NextResponse.json(
        { erro: "Atividade não encontrada." },
        { status: 404 }
      );
    }

    const { error: erroDelete } = await supabase
      .from("pipeline_historico")
      .delete()
      .eq("id", atividadeId)
      .eq("organizacao_id", orgId);

    if (erroDelete) {
      return NextResponse.json(
        { erro: "Não foi possível remover a atividade." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao remover atividade:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos remover a atividade." },
      { status: 500 }
    );
  }
}
