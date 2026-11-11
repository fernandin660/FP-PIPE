import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { COR_HEX, UUID, erro, lerCorpo, somenteAdmin, texto } from "../../../../lib/crm-api";

/** POST: nova etapa no fim de um funil (admin). */
export async function POST(request: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const corpo = await lerCorpo(request);
  const funilId = typeof corpo?.pipeline_id === "string" && UUID.test(corpo.pipeline_id) ? corpo.pipeline_id : null;
  const nome = texto(corpo?.nome, 40);
  if (!funilId || !nome) return erro("Informe o funil e o nome da etapa.");

  const { data: funil } = await supabase
    .from("pipelines")
    .select("id")
    .eq("id", funilId)
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (!funil) return erro("Funil não encontrado.", 404);

  const { data: etapas } = await supabase
    .from("pipeline_stages")
    .select("ordem_estagio")
    .eq("pipeline_id", funilId)
    .order("ordem_estagio", { ascending: false })
    .limit(1);
  if ((etapas?.length ?? 0) > 0 && (etapas![0].ordem_estagio as number) >= 30) {
    return erro("Limite de 30 etapas por funil.");
  }

  const prob = Number(corpo?.probabilidade);
  const { data, error } = await supabase
    .from("pipeline_stages")
    .insert({
      organizacao_id: orgId,
      pipeline_id: funilId,
      nome,
      cor: typeof corpo?.cor === "string" && COR_HEX.test(corpo.cor) ? corpo.cor : "#94a3b8",
      probabilidade: Number.isInteger(prob) && prob >= 0 && prob <= 100 ? prob : null,
      ordem_estagio: ((etapas?.[0]?.ordem_estagio as number | undefined) ?? 0) + 1,
    })
    .select("id, nome, cor, ordem_estagio, probabilidade, pipeline_id")
    .single();
  if (error?.code === "23505") return erro("Já existe uma etapa com esse nome neste funil.", 409);
  if (error || !data) return erro("Não foi possível criar a etapa.", 500);
  return NextResponse.json({ estagio: data }, { status: 201 });
}

/**
 * PATCH: ajusta uma etapa (admin): nome, cor, chance de fechar (0–100)
 * e/ou posição. Aceita também { pipeline_id, ordem: [ids] } para reordenar
 * todas as etapas de um funil de uma vez.
 */
export async function PATCH(request: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;

  if (papel !== "admin") {
    return NextResponse.json(
      { erro: "Só administradores podem ajustar o funil." },
      { status: 403 }
    );
  }

  const body = await lerCorpo(request);
  if (!body) return erro("JSON inválido.");

  // Reordenação em bloco.
  if (Array.isArray(body.ordem)) {
    const funilId = typeof body.pipeline_id === "string" ? body.pipeline_id : "";
    const ids = (body.ordem as unknown[]).filter((x): x is string => typeof x === "string" && UUID.test(x));
    const { data: etapas } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("organizacao_id", orgId)
      .eq("pipeline_id", funilId);
    const validos = new Set((etapas ?? []).map((e) => e.id as string));
    if (ids.length !== validos.size || ids.some((id) => !validos.has(id))) {
      return erro("Envie todas as etapas do funil, na nova ordem.");
    }
    for (const [i, id] of ids.entries()) {
      await supabase.from("pipeline_stages").update({ ordem_estagio: i + 1 }).eq("id", id).eq("organizacao_id", orgId);
    }
    return NextResponse.json({ ok: true });
  }

  const stageId = typeof body.stage_id === "string" ? body.stage_id.trim() : "";
  if (!UUID.test(stageId)) return erro("Etapa inválida.");

  const mudancas: { nome?: string; cor?: string; probabilidade?: number } = {};
  if (body.nome !== undefined) {
    const nome = texto(body.nome, 40);
    if (!nome) return erro("Dê um nome à etapa.");
    mudancas.nome = nome;
  }
  if (body.cor !== undefined) {
    if (typeof body.cor !== "string" || !COR_HEX.test(body.cor)) return erro("Cor inválida.");
    mudancas.cor = body.cor;
  }
  if (body.probabilidade !== undefined) {
    const prob = Number(body.probabilidade);
    if (!Number.isInteger(prob) || prob < 0 || prob > 100) {
      return erro("Informe uma probabilidade entre 0 e 100.");
    }
    mudancas.probabilidade = prob;
  }
  if (Object.keys(mudancas).length === 0) return erro("Nada para alterar.");

  const { data, error } = await supabase
    .from("pipeline_stages")
    .update(mudancas)
    .eq("id", stageId)
    .eq("organizacao_id", orgId)
    .select("id, nome, cor, probabilidade")
    .maybeSingle();

  if (error?.code === "23505") return erro("Já existe uma etapa com esse nome neste funil.", 409);
  if (error || !data) {
    return NextResponse.json({ erro: "Estágio não encontrado nesta organização." }, { status: 404 });
  }
  return NextResponse.json({ estagio: data });
}

/**
 * DELETE ?id=&mover_para=: apaga uma etapa (admin). Se houver negócios
 * nela, é preciso indicar outra etapa do mesmo funil para onde movê-los.
 */
export async function DELETE(request: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel, usuarioId } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const destino = url.searchParams.get("mover_para");
  if (!UUID.test(id)) return erro("Etapa inválida.");

  const { data: etapa } = await supabase
    .from("pipeline_stages")
    .select("id, pipeline_id")
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (!etapa) return erro("Etapa não encontrada.", 404);

  const { data: irmas } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("organizacao_id", orgId)
    .eq("pipeline_id", etapa.pipeline_id);
  if ((irmas?.length ?? 0) <= 2) return erro("Um funil precisa de pelo menos duas etapas.");

  const { data: negocios } = await supabase
    .from("lead_pipeline")
    .select("id, company_id")
    .eq("organizacao_id", orgId)
    .eq("stage_id", id);

  if ((negocios?.length ?? 0) > 0) {
    if (!destino || destino === id || !(irmas ?? []).some((e) => e.id === destino)) {
      return erro("Escolha para qual etapa deste funil os negócios serão movidos.", 409);
    }
    const { error: erroMover } = await supabase
      .from("lead_pipeline")
      .update({ stage_id: destino, atualizado_em: new Date().toISOString() })
      .eq("organizacao_id", orgId)
      .eq("stage_id", id);
    if (erroMover) return erro("Não foi possível mover os negócios.", 500);
    await supabase.from("pipeline_historico").insert(
      (negocios ?? []).map((n) => ({
        organizacao_id: orgId,
        lead_pipeline_id: n.id,
        company_id: n.company_id,
        usuario_id: usuarioId,
        tipo_evento: "mudanca_estagio",
        stage_origem_id: null,
        stage_destino_id: destino,
        dados: { etapa_apagada: true },
      }))
    );
  }

  const { error } = await supabase.from("pipeline_stages").delete().eq("id", id).eq("organizacao_id", orgId);
  if (error) return erro("Não foi possível apagar a etapa.", 500);
  return NextResponse.json({ ok: true });
}
