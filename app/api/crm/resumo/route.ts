import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { listarEstagios } from "../../../../lib/crm";

/**
 * Resumo leve do pipeline da organização, usado para dar visibilidade
 * do CRM fora da página /crm (ex.: indicador no menu lateral).
 */
export async function GET() {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;

    const { supabase, orgId } = ctx!;

    const estagios = await listarEstagios(supabase, orgId);

    const contagensPorEstagio = new Map<string, number>();
    let total = 0;

    if (estagios.length > 0) {
      const { data } = await supabase
        .from("lead_pipeline")
        .select("stage_id")
        .eq("organizacao_id", orgId);

      for (const l of (data ?? []) as Array<{ stage_id: string }>) {
        if (!l.stage_id) continue;
        contagensPorEstagio.set(
          l.stage_id,
          (contagensPorEstagio.get(l.stage_id) ?? 0) + 1
        );
        total += 1;
      }
    }

    const porEstagio = estagios
      .map((s) => ({
        id: s.id,
        nome: s.nome,
        cor: s.cor,
        total: contagensPorEstagio.get(s.id) ?? 0,
      }))
      .filter((s) => s.total > 0);

    return NextResponse.json({ total, porEstagio });
  } catch (erro) {
    console.error("Erro no resumo CRM:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos carregar o resumo." },
      { status: 500 }
    );
  }
}
