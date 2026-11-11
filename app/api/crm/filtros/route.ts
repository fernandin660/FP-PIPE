import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { UUID, erro, lerCorpo, texto } from "../../../../lib/crm-api";

const ENTIDADES = new Set(["negocio", "lead"]);
const COLUNAS = "id, usuario_id, entidade, nome, filtros, colunas, compartilhado, criado_em, atualizado_em";

/** Objeto JSON pequeno (filtros) ou lista de textos curtos (colunas). */
function objetoFiltros(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return JSON.stringify(v).length <= 8000 ? (v as Record<string, unknown>) : null;
}
function listaColunas(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const itens = v.filter((x): x is string => typeof x === "string" && x.length <= 80).slice(0, 40);
  return itens;
}

/** GET ?entidade=negocio|lead: filtros do usuário e os compartilhados com a equipe. */
export async function GET(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, usuarioId } = ctx!;
  const entidade = new URL(req.url).searchParams.get("entidade") ?? "negocio";
  if (!ENTIDADES.has(entidade)) return erro("Entidade inválida.");

  const { data, error } = await supabase
    .from("crm_filtros")
    .select(COLUNAS)
    .eq("organizacao_id", orgId)
    .eq("entidade", entidade)
    .order("nome", { ascending: true });
  if (error) return erro("Não conseguimos carregar os filtros salvos.", 500);
  return NextResponse.json({
    filtros: (data ?? []).map((f) => ({ ...f, meu: f.usuario_id === usuarioId })),
  });
}

/** POST: salva um filtro novo. */
export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, usuarioId } = ctx!;
  const corpo = await lerCorpo(req);
  if (!corpo) return erro("JSON inválido.");

  const nome = texto(corpo.nome, 80);
  if (!nome) return erro("Dê um nome ao filtro.");
  const entidade = typeof corpo.entidade === "string" && ENTIDADES.has(corpo.entidade) ? corpo.entidade : "negocio";
  const filtros = objetoFiltros(corpo.filtros);
  if (!filtros) return erro("Filtro inválido.");

  const { data, error } = await supabase
    .from("crm_filtros")
    .insert({
      organizacao_id: orgId,
      usuario_id: usuarioId,
      entidade,
      nome,
      filtros,
      colunas: listaColunas(corpo.colunas) ?? [],
      compartilhado: corpo.compartilhado === true,
    })
    .select(COLUNAS)
    .single();
  if (error || !data) return erro("Não foi possível salvar o filtro.", 500);
  return NextResponse.json({ filtro: { ...data, meu: true } }, { status: 201 });
}

/** PATCH: renomeia, atualiza critérios/colunas ou compartilha. */
export async function PATCH(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, usuarioId } = ctx!;
  const corpo = await lerCorpo(req);
  if (!corpo || typeof corpo.id !== "string" || !UUID.test(corpo.id)) return erro("Filtro inválido.");

  const mudancas: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  if (corpo.nome !== undefined) {
    const nome = texto(corpo.nome, 80);
    if (!nome) return erro("Dê um nome ao filtro.");
    mudancas.nome = nome;
  }
  if (corpo.filtros !== undefined) {
    const filtros = objetoFiltros(corpo.filtros);
    if (!filtros) return erro("Filtro inválido.");
    mudancas.filtros = filtros;
  }
  if (corpo.colunas !== undefined) mudancas.colunas = listaColunas(corpo.colunas) ?? [];
  if (corpo.compartilhado !== undefined) mudancas.compartilhado = corpo.compartilhado === true;

  const { data, error } = await supabase
    .from("crm_filtros")
    .update(mudancas)
    .eq("id", corpo.id)
    .eq("organizacao_id", orgId)
    .select(COLUNAS)
    .maybeSingle();
  if (error) return erro("Não foi possível atualizar o filtro.", 500);
  if (!data) return erro("Você só pode alterar filtros criados por você.", 403);
  return NextResponse.json({ filtro: { ...data, meu: data.usuario_id === usuarioId } });
}

/** DELETE ?id=: apaga o filtro (o autor ou um admin). */
export async function DELETE(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return erro("Filtro inválido.");
  const { data, error } = await supabase
    .from("crm_filtros")
    .delete()
    .eq("id", id)
    .eq("organizacao_id", orgId)
    .select("id");
  if (error) return erro("Não foi possível apagar o filtro.", 500);
  if (!data?.length) return erro("Você só pode apagar filtros criados por você.", 403);
  return NextResponse.json({ ok: true });
}
