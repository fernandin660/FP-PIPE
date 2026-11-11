import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { TIPOS_CAMPO, type EntidadeCampo, type TipoCampo } from "../../../../lib/crm-campos";
import { UUID, erro, lerCorpo, somenteAdmin, texto } from "../../../../lib/crm-api";

const ENTIDADES: EntidadeCampo[] = ["negocio", "organizacao", "pessoa"];

function opcoesValidas(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const lista = [...new Set(v.map((o) => (typeof o === "string" ? o.trim().slice(0, 60) : "")).filter(Boolean))];
  return lista.length > 0 && lista.length <= 50 ? lista : null;
}

/** GET: campos personalizados da organização (todas as entidades). */
export async function GET() {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const { data } = await supabase
    .from("crm_campos")
    .select("id, entidade, nome, tipo, opcoes, ordem")
    .eq("organizacao_id", orgId)
    .order("entidade")
    .order("ordem");
  return NextResponse.json({ campos: data ?? [] });
}

/** POST: cria um campo (admin). */
export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const corpo = await lerCorpo(req);
  const entidade = corpo?.entidade as EntidadeCampo;
  const tipo = corpo?.tipo as TipoCampo;
  const nome = texto(corpo?.nome, 60);
  if (!ENTIDADES.includes(entidade)) return erro("Escolha onde o campo vai aparecer.");
  if (!TIPOS_CAMPO.some((t) => t.valor === tipo)) return erro("Tipo de campo inválido.");
  if (!nome) return erro("Dê um nome ao campo.");
  let opcoes: string[] = [];
  if (tipo === "opcao") {
    const lista = opcoesValidas(corpo?.opcoes);
    if (!lista) return erro("Informe de 1 a 50 opções.");
    opcoes = lista;
  }

  const { count } = await supabase
    .from("crm_campos")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", orgId)
    .eq("entidade", entidade);
  if ((count ?? 0) >= 40) return erro("Limite de 40 campos por tipo de cadastro.");

  const { data, error } = await supabase
    .from("crm_campos")
    .insert({ organizacao_id: orgId, entidade, nome, tipo, opcoes, ordem: count ?? 0 })
    .select("id, entidade, nome, tipo, opcoes, ordem")
    .single();
  if (error?.code === "23505") return erro("Já existe um campo com esse nome.", 409);
  if (error || !data) return erro("Não foi possível criar o campo.", 500);
  return NextResponse.json({ campo: data }, { status: 201 });
}

/** PATCH: renomeia, troca opções ou posição de um campo (admin). O tipo não muda. */
export async function PATCH(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const corpo = await lerCorpo(req);
  const id = typeof corpo?.id === "string" && UUID.test(corpo.id) ? corpo.id : null;
  if (!id) return erro("Campo inválido.");

  const mudancas: { nome?: string; opcoes?: string[]; ordem?: number } = {};
  if (corpo?.nome !== undefined) {
    const nome = texto(corpo.nome, 60);
    if (!nome) return erro("Dê um nome ao campo.");
    mudancas.nome = nome;
  }
  if (corpo?.opcoes !== undefined) {
    const lista = opcoesValidas(corpo.opcoes);
    if (!lista) return erro("Informe de 1 a 50 opções.");
    mudancas.opcoes = lista;
  }
  if (corpo?.ordem !== undefined) {
    const ordem = Number(corpo.ordem);
    if (!Number.isInteger(ordem) || ordem < 0 || ordem > 1000) return erro("Ordem inválida.");
    mudancas.ordem = ordem;
  }
  if (Object.keys(mudancas).length === 0) return erro("Nada para alterar.");

  const { data, error } = await supabase
    .from("crm_campos")
    .update(mudancas)
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select("id, entidade, nome, tipo, opcoes, ordem")
    .maybeSingle();
  if (error?.code === "23505") return erro("Já existe um campo com esse nome.", 409);
  if (error || !data) return erro("Campo não encontrado.", 404);
  return NextResponse.json({ campo: data });
}

/** DELETE ?id=: apaga a definição do campo (admin). Os valores antigos deixam de aparecer. */
export async function DELETE(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, papel } = ctx!;
  const bloqueio = somenteAdmin(papel);
  if (bloqueio) return bloqueio;

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return erro("Campo inválido.");
  const { error } = await supabase.from("crm_campos").delete().eq("id", id).eq("organizacao_id", orgId);
  if (error) return erro("Não foi possível apagar o campo.", 500);
  return NextResponse.json({ ok: true });
}
