import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { listarEstagios, listarFunis } from "../../../../lib/crm";
import { UUID, erro, lerCorpo, somenteAdmin, texto } from "../../../../lib/crm-api";

const ETAPAS_NOVO_FUNIL = [
  { nome: "Qualificação", cor: "#94a3b8", probabilidade: 10 },
  { nome: "Contato feito", cor: "#3b82f6", probabilidade: 20 },
  { nome: "Proposta enviada", cor: "#8b5cf6", probabilidade: 50 },
  { nome: "Negociação", cor: "#f97316", probabilidade: 70 },
  { nome: "Ganho", cor: "#16a34a", probabilidade: 100 },
  { nome: "Perdido", cor: "#ef4444", probabilidade: 0 },
];

/** GET: funis da organização com as etapas e a quantidade de negócios. */
export async function GET() {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;

  const [funis, etapas, { data: negocios }] = await Promise.all([
    listarFunis(supabase, orgId),
    listarEstagios(supabase, orgId),
    supabase.from("lead_pipeline").select("pipeline_id, stage_id").eq("organizacao_id", orgId),
  ]);
  const porEtapa = new Map<string, number>();
  const porFunil = new Map<string, number>();
  for (const n of (negocios ?? []) as Array<{ pipeline_id: string; stage_id: string }>) {
    porEtapa.set(n.stage_id, (porEtapa.get(n.stage_id) ?? 0) + 1);
    porFunil.set(n.pipeline_id, (porFunil.get(n.pipeline_id) ?? 0) + 1);
  }
  return NextResponse.json({
    funis: funis.map((f) => ({
      ...f,
      negocios: porFunil.get(f.id) ?? 0,
      etapas: etapas
        .filter((e) => e.pipeline_id === f.id)
        .map((e) => ({ ...e, negocios: porEtapa.get(e.id) ?? 0 })),
    })),
  });
}

/** POST: cria um funil (admin), com etapas iniciais editáveis. */
export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const corpo = await lerCorpo(req);
  const nome = texto(corpo?.nome, 60);
  if (!nome) return erro("Dê um nome ao funil.");

  const funis = await listarFunis(supabase, orgId);
  if (funis.length >= 20) return erro("Limite de 20 funis por organização.");
  if (funis.some((f) => f.nome.toLowerCase() === nome.toLowerCase())) return erro("Já existe um funil com esse nome.", 409);

  const { data: funil, error } = await supabase
    .from("pipelines")
    .insert({ organizacao_id: orgId, nome, ordem: (funis.at(-1)?.ordem ?? 0) + 1 })
    .select("id, nome, ordem")
    .single();
  if (error || !funil) return erro("Não foi possível criar o funil.", 500);

  const { error: erroEtapas } = await supabase.from("pipeline_stages").insert(
    ETAPAS_NOVO_FUNIL.map((e, i) => ({
      organizacao_id: orgId,
      pipeline_id: funil.id,
      nome: e.nome,
      cor: e.cor,
      probabilidade: e.probabilidade,
      ordem_estagio: i + 1,
    }))
  );
  if (erroEtapas) {
    await supabase.from("pipelines").delete().eq("id", funil.id).eq("organizacao_id", orgId);
    return erro("Não foi possível criar as etapas do funil.", 500);
  }
  return NextResponse.json({ funil }, { status: 201 });
}

/** PATCH: renomeia ou reordena um funil (admin). */
export async function PATCH(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const corpo = await lerCorpo(req);
  const id = typeof corpo?.id === "string" && UUID.test(corpo.id) ? corpo.id : null;
  if (!id) return erro("Funil inválido.");

  const mudancas: { nome?: string; ordem?: number } = {};
  if (corpo?.nome !== undefined) {
    const nome = texto(corpo.nome, 60);
    if (!nome) return erro("Dê um nome ao funil.");
    mudancas.nome = nome;
  }
  if (corpo?.ordem !== undefined) {
    const ordem = Number(corpo.ordem);
    if (!Number.isInteger(ordem) || ordem < 0 || ordem > 1000) return erro("Ordem inválida.");
    mudancas.ordem = ordem;
  }
  if (Object.keys(mudancas).length === 0) return erro("Nada para alterar.");

  const { data, error } = await supabase
    .from("pipelines")
    .update(mudancas)
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select("id, nome, ordem")
    .maybeSingle();
  if (error?.code === "23505") return erro("Já existe um funil com esse nome.", 409);
  if (error || !data) return erro("Funil não encontrado.", 404);
  return NextResponse.json({ funil: data });
}

/** DELETE ?id=: apaga um funil vazio (admin). O último funil não pode ser apagado. */
export async function DELETE(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return erro("Funil inválido.");

  const funis = await listarFunis(supabase, orgId);
  if (!funis.some((f) => f.id === id)) return erro("Funil não encontrado.", 404);
  if (funis.length <= 1) return erro("A organização precisa de pelo menos um funil.");

  const { count } = await supabase
    .from("lead_pipeline")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", orgId)
    .eq("pipeline_id", id);
  if ((count ?? 0) > 0) {
    return erro("Mova ou exclua os negócios deste funil antes de apagá-lo.", 409);
  }

  const { error } = await supabase.from("pipelines").delete().eq("id", id).eq("organizacao_id", orgId);
  if (error) return erro("Não foi possível apagar o funil.", 500);
  return NextResponse.json({ ok: true });
}
