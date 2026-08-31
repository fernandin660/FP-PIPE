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
 * GET: lista atividades pendentes (programadas de cadência + tarefas/agendadas
 *   manuais) com nome da empresa, estágio e responsável — usado no Dashboard.
 *   Admin vê todas da organização; membros veem as suas (autor ou responsável
 *   do lead).
 * POST: cria uma atividade manual (tipo, título, observação e data/hora
 *   da atividade). A `data_hora_atividade` fica em `dados` e é editável —
 *   separada de `criado_em`, que registra o momento real da escrita.
 * PATCH: edita os campos da atividade manual ou programada; aceita `concluida`
 *   para concluir/reabrir.
 * DELETE: remove uma atividade manual.
 */
export async function GET(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId, usuarioId, papel } = ctx!;

    const { data: eventosLinhas, error: erroEv } = await supabase
      .from("pipeline_historico")
      .select(
        "id, lead_pipeline_id, company_id, usuario_id, tipo_evento, dados, criado_em"
      )
      .eq("organizacao_id", orgId)
      .in("tipo_evento", ["atividade_programada", "atividade"])
      .order("criado_em", { ascending: false })
      .limit(500);

    if (erroEv) {
      return NextResponse.json(
        { erro: "Não conseguimos carregar as atividades pendentes." },
        { status: 500 }
      );
    }

    const eventos = (eventosLinhas ?? []) as Array<{
      id: string;
      lead_pipeline_id: string | null;
      company_id: string;
      usuario_id: string | null;
      tipo_evento: string;
      dados: Record<string, unknown>;
      criado_em: string;
    }>;

    const agora = Date.now();

    const url = new URL(request.url);
    const de = url.searchParams.get("de"); // YYYY-MM-DD
    const ate = url.searchParams.get("ate"); // YYYY-MM-DD
    const tsDe = de ? new Date(`${de}T00:00:00`).getTime() : null;
    const tsAte = ate ? new Date(`${ate}T23:59:59.999`).getTime() : null;

    // "Pendentes": não canceladas e não concluídas. Atividades manuais só
    // entram quando são tarefas ou têm data futura (agendadas). O período
    // `de`/`ate` filtra pela data/hora da atividade (para não exibir a
    // cadência inteira de uma vez no Dashboard).
    const candidatas = eventos.filter((ev) => {
      const dados = (ev.dados ?? {}) as Record<string, unknown>;
      if (dados.cancelada === true) return false;
      if (dados.concluida === true) return false;

      const dtStr = texto(dados.data_hora_atividade);
      const dt = dtStr ? new Date(dtStr).getTime() : null;

      if (ev.tipo_evento === "atividade") {
        const tipo = texto(dados.tipo_atividade);
        if (tipo !== "tarefa") {
          if (dt === null || dt < agora) return false;
        }
      }

      if (dt !== null) {
        if (tsDe !== null && dt < tsDe) return false;
        if (tsAte !== null && dt > tsAte) return false;
      }
      return true;
    });

    const leadIds = Array.from(
      new Set(candidatas.map((e) => e.lead_pipeline_id).filter(Boolean) as string[])
    );
    const companyIds = Array.from(
      new Set(candidatas.map((e) => e.company_id).filter(Boolean))
    );

    const [{ data: leadsLinhas }, { data: compsLinhas }, { data: stagesLinhas }] =
      await Promise.all([
        supabase
          .from("lead_pipeline")
          .select("id, company_id, stage_id, responsavel_id")
          .in("id", leadIds),
        supabase
          .from("companies")
          .select("id, razao_social, nome_fantasia")
          .in("id", companyIds),
        supabase
          .from("pipeline_stages")
          .select("id, nome")
          .eq("organizacao_id", orgId),
      ]);

    const mapaLead = new Map<
      string,
      { company_id: string; stage_id: string | null; responsavel_id: string | null }
    >();
    for (const l of (leadsLinhas ?? []) as Array<{
      id: string;
      company_id: string;
      stage_id: string | null;
      responsavel_id: string | null;
    }>) {
      mapaLead.set(l.id, l);
    }

    const mapaEmpresa = new Map<string, string>();
    for (const c of (compsLinhas ?? []) as Array<{
      id: string;
      razao_social: string | null;
      nome_fantasia: string | null;
    }>) {
      mapaEmpresa.set(
        c.id,
        c.nome_fantasia?.trim() || c.razao_social?.trim() || "Empresa"
      );
    }

    const mapaStageNome = new Map<string, string>();
    for (const s of (stagesLinhas ?? []) as Array<{ id: string; nome: string }>) {
      mapaStageNome.set(s.id, s.nome);
    }

    const idsPessoas = new Set<string>();
    for (const e of candidatas) {
      if (e.usuario_id) idsPessoas.add(e.usuario_id);
    }
    for (const l of mapaLead.values()) {
      if (l.responsavel_id) idsPessoas.add(l.responsavel_id);
    }
    const mapaNomePessoa = new Map<string, string | null>();
    if (idsPessoas.size > 0) {
      const { data: perfis } = await supabase
        .from("perfil")
        .select("usuario_id, nome_usuario")
        .in("usuario_id", Array.from(idsPessoas));
      for (const p of (perfis ?? []) as Array<{
        usuario_id: string;
        nome_usuario: string | null;
      }>) {
        mapaNomePessoa.set(p.usuario_id, p.nome_usuario);
      }
    }

    const ehAdmin = papel === "admin";

    const pendentes = [];
    for (const ev of candidatas) {
      const dados = (ev.dados ?? {}) as Record<string, unknown>;
      const lead = ev.lead_pipeline_id ? mapaLead.get(ev.lead_pipeline_id) : undefined;

      // Membros veem apenas as próprias atividades (ou de leads sob sua
      // responsabilidade). Admin vê tudo da organização.
      const pertence =
        ehAdmin ||
        ev.usuario_id === usuarioId ||
        (lead?.responsavel_id != null && lead.responsavel_id === usuarioId);
      if (!pertence) continue;

      const dataHora = texto(dados.data_hora_atividade);
      const dt = dataHora ? new Date(dataHora).getTime() : null;

      pendentes.push({
        id: ev.id,
        tipo_evento: ev.tipo_evento,
        tipo_atividade: texto(dados.tipo_atividade) || "email",
        titulo: texto(dados.titulo) || "Atividade",
        observacao: texto(dados.observacao),
        data_hora_atividade: dataHora || null,
        concluida: false,
        atrasada: dt !== null && dt < agora,
        company_id: ev.company_id,
        empresa: lead ? mapaEmpresa.get(lead.company_id) ?? "Empresa" : "Empresa",
        stage_nome: lead ? mapaStageNome.get(lead.stage_id ?? "") ?? null : null,
        responsavel_nome:
          lead?.responsavel_id != null
            ? mapaNomePessoa.get(lead.responsavel_id) ?? null
            : null,
        autor_nome: ev.usuario_id ? mapaNomePessoa.get(ev.usuario_id) ?? null : null,
        criado_em: ev.criado_em,
      });
    }

    pendentes.sort((a, b) => {
      if (!a.data_hora_atividade) return 1;
      if (!b.data_hora_atividade) return -1;
      return (
        new Date(a.data_hora_atividade).getTime() -
        new Date(b.data_hora_atividade).getTime()
      );
    });

    return NextResponse.json({ pendentes });
  } catch (erro) {
    console.error("Erro ao listar atividades pendentes:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos carregar as atividades pendentes." },
      { status: 500 }
    );
  }
}

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
    const { supabase, orgId, usuarioId, papel } = ctx!;

    let body: {
      atividade_id?: unknown;
      tipo_atividade?: unknown;
      titulo?: unknown;
      observacao?: unknown;
      data_hora_atividade?: unknown;
      concluida?: unknown;
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
      .select("id, dados, tipo_evento, lead_pipeline_id, usuario_id")
      .eq("id", atividadeId)
      .eq("organizacao_id", orgId)
      .single();

    if (!atual) {
      return NextResponse.json(
        { erro: "Atividade não encontrada nesta organização." },
        { status: 404 }
      );
    }
    if (
      atual.tipo_evento !== "atividade" &&
      atual.tipo_evento !== "atividade_programada"
    ) {
      return NextResponse.json(
        { erro: "Apenas atividades podem ser editadas." },
        { status: 400 }
      );
    }

    // Membros só editam atividades de sua autoria ou de leads sob sua
    // responsabilidade.
    if (papel !== "admin") {
      let ehMeu = atual.usuario_id === usuarioId;
      if (!ehMeu && atual.lead_pipeline_id) {
        const { data: l } = await supabase
          .from("lead_pipeline")
          .select("responsavel_id")
          .eq("id", atual.lead_pipeline_id)
          .maybeSingle();
        if (l?.responsavel_id === usuarioId) ehMeu = true;
      }
      if (!ehMeu) {
        return NextResponse.json(
          { erro: "Você não pode editar esta atividade." },
          { status: 403 }
        );
      }
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
    if (body.concluida !== undefined) {
      const concluida = body.concluida === true || body.concluida === "true";
      novosDados.concluida = concluida;
      if (concluida) {
        novosDados.concluida_em = new Date().toISOString();
      } else {
        delete novosDados.concluida_em;
      }
    }

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
