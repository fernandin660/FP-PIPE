import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";

/**
 * PATCH: ajusta a probabilidade de fechamento de um estágio (0–100),
 * usada na previsão de receita do funil. Só administradores.
 */
export async function PATCH(request: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;

  if (papel !== "admin") {
    return NextResponse.json(
      { erro: "Só administradores podem ajustar a previsão do funil." },
      { status: 403 }
    );
  }

  let body: { stage_id?: unknown; probabilidade?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const stageId = typeof body.stage_id === "string" ? body.stage_id.trim() : "";
  const prob = Number(body.probabilidade);
  if (!stageId || !Number.isInteger(prob) || prob < 0 || prob > 100) {
    return NextResponse.json(
      { erro: "Informe um estágio e uma probabilidade entre 0 e 100." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pipeline_stages")
    .update({ probabilidade: prob })
    .eq("id", stageId)
    .eq("organizacao_id", orgId)
    .select("id, probabilidade")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ erro: "Estágio não encontrado nesta organização." }, { status: 404 });
  }
  return NextResponse.json({ estagio: data });
}
