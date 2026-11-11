import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { ehMembroAtivo, listarFunis } from "../../../../lib/crm";
import { UUID, erro, lerCorpo, somenteAdmin } from "../../../../lib/crm-api";

const TIPOS = new Set(["valor_ganho", "negocios_ganhos", "negocios_criados", "atividades_concluidas"]);
const PERIODOS = new Set(["mes", "trimestre"]);

/** POST: cria uma meta (só administradores). */
export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;
  const corpo = await lerCorpo(req);
  if (!corpo) return erro("JSON inválido.");

  const tipo = String(corpo.tipo ?? "");
  const periodo = String(corpo.periodo ?? "mes");
  const alvo = typeof corpo.alvo === "number" ? corpo.alvo : Number(corpo.alvo);
  if (!TIPOS.has(tipo)) return erro("Tipo de meta inválido.");
  if (!PERIODOS.has(periodo)) return erro("Período inválido.");
  if (!Number.isFinite(alvo) || alvo <= 0 || alvo > 1e12) return erro("Informe um alvo maior que zero.");

  let usuarioId: string | null = null;
  if (typeof corpo.usuario_id === "string" && corpo.usuario_id) {
    if (!UUID.test(corpo.usuario_id) || !(await ehMembroAtivo(supabase, orgId, corpo.usuario_id))) return erro("Pessoa não faz parte da equipe.");
    usuarioId = corpo.usuario_id;
  }
  let pipelineId: string | null = null;
  if (typeof corpo.pipeline_id === "string" && corpo.pipeline_id) {
    const funis = await listarFunis(supabase, orgId);
    if (!funis.some((f) => f.id === corpo.pipeline_id)) return erro("Funil inválido.");
    pipelineId = corpo.pipeline_id;
  }

  const { data, error } = await supabase
    .from("crm_metas")
    .insert({ organizacao_id: orgId, usuario_id: usuarioId, pipeline_id: pipelineId, tipo, periodo, alvo })
    .select("id")
    .single();
  if (error || !data) return erro("Não foi possível salvar a meta.", 500);
  return NextResponse.json({ id: data.id }, { status: 201 });
}

/** DELETE ?id=: remove a meta (só administradores). */
export async function DELETE(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return erro("Meta inválida.");
  const { error } = await supabase.from("crm_metas").delete().eq("id", id).eq("organizacao_id", orgId);
  if (error) return erro("Não foi possível remover a meta.", 500);
  return NextResponse.json({ ok: true });
}
