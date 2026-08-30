import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import {
  resolverAlvos,
  deduplicar,
  listarEstagios,
  listarMembros,
  type PayloadAlvos,
} from "../../../../lib/crm";

const ORIGENS_PERMITIDAS = new Set([
  "busca_empresa",
  "busca_contato",
  "lista",
  "manual",
  "importacao",
]);

export async function POST(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;

    const { supabase, orgId, usuarioId } = ctx!;

    let body: { payload?: PayloadAlvos; stage_id?: string; responsavel_id?: string; origem?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const payload: PayloadAlvos = body.payload ?? {
      cnpjs: Array.isArray((body as unknown as { cnpjs?: unknown }).cnpjs)
        ? ((body as unknown as { cnpjs: string[] }).cnpjs)
        : undefined,
      company_ids: Array.isArray((body as unknown as { company_ids?: unknown }).company_ids)
        ? ((body as unknown as { company_ids: string[] }).company_ids)
        : undefined,
      contact_ids: Array.isArray((body as unknown as { contact_ids?: unknown }).contact_ids)
        ? ((body as unknown as { contact_ids: string[] }).contact_ids)
        : undefined,
    };

    const stageId =
      typeof body.stage_id === "string" && body.stage_id ? body.stage_id : null;
    const responsavelId =
      typeof body.responsavel_id === "string" && body.responsavel_id
        ? body.responsavel_id
        : null;
    const origem =
      typeof body.origem === "string" && ORIGENS_PERMITIDAS.has(body.origem)
        ? body.origem
        : null;

    const alvos = deduplicar(await resolverAlvos(supabase, orgId, payload));
    if (alvos.length === 0) {
      return NextResponse.json(
        { erro: "Nenhuma empresa correspondente encontrada para adicionar." },
        { status: 400 }
      );
    }

    // Estágio inicial padrão = primeira coluna; responsável padrão = usuário.
    const estagios = await listarEstagios(supabase, orgId);
    const stageFinal =
      estagios.find((s) => s.id === stageId) ?? estagios[0] ?? null;
    if (!stageFinal) {
      return NextResponse.json(
        { erro: "Pipeline não configurado. Tente novamente." },
        { status: 500 }
      );
    }

    const companyIds = alvos.map((a) => a.company_id);

    // Separa novas (ainda não no pipeline da org) das já existentes.
    const { data: existentes } = await supabase
      .from("lead_pipeline")
      .select("company_id")
      .eq("organizacao_id", orgId)
      .in("company_id", companyIds);

    const jaExistemSet = new Set(
      (existentes ?? []).map((l: { company_id: string }) => l.company_id)
    );
    const novas = alvos.filter((a) => !jaExistemSet.has(a.company_id));

    const inseridas: Array<{ id: string; company_id: string }> = [];
    const jaExistem: string[] = Array.from(jaExistemSet);
    const ignoradas: Array<{ company_id: string; motivo: string }> = [];

    if (novas.length > 0) {
      // Ordenação inicial: continua após o último na coluna de destino.
      const { count } = await supabase
        .from("lead_pipeline")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", stageFinal.id);
      let ordenacao = count ?? 0;

      for (const alvo of novas) {
        const { data: novo, error: erroInsert } = await supabase
          .from("lead_pipeline")
          .insert({
            organizacao_id: orgId,
            company_id: alvo.company_id,
            stage_id: stageFinal.id,
            responsavel_id: responsavelId ?? usuarioId,
            ordenacao,
          })
          .select("id, company_id")
          .single();

        if (erroInsert || !novo) {
          ignoradas.push({ company_id: alvo.company_id, motivo: "duplicada" });
          continue;
        }

        inseridas.push({ id: novo.id, company_id: novo.company_id });
        await supabase.from("pipeline_historico").insert({
          organizacao_id: orgId,
          lead_pipeline_id: novo.id,
          company_id: alvo.company_id,
          usuario_id: usuarioId,
          tipo_evento: "lead_adicionado",
          stage_destino_id: stageFinal.id,
          dados: {
            responsavel_id: responsavelId ?? usuarioId,
            origem: origem ?? alvo.origem ?? null,
          },
        });

        ordenacao += 1;
      }
    }

    const estagiosResposta = estagios.map((s) => ({
      id: s.id,
      nome: s.nome,
      cor: s.cor,
      ordem_estagio: s.ordem_estagio,
    }));
    const membrosResposta = (await listarMembros(supabase, orgId)).map((m) => ({
      usuario_id: m.usuario_id,
      nome: m.nome,
      email: m.email,
    }));

    return NextResponse.json({
      ok: true,
      selecionadas: alvos.length,
      adicionadas: inseridas.length,
      jaExistem,
      ignoradas,
      stageFinal: {
        id: stageFinal.id,
        nome: stageFinal.nome,
      },
      stages: estagiosResposta,
      membros: membrosResposta,
    });
  } catch (erro) {
    console.error("Erro no bulk CRM:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos adicionar ao CRM agora." },
      { status: 500 }
    );
  }
}
