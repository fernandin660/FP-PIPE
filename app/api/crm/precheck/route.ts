import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import {
  resolverAlvos,
  deduplicar,
  listarEstagios,
  listarFunis,
  listarMembros,
  type PayloadAlvos,
} from "../../../../lib/crm";

export async function POST(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;

    const { supabase, orgId } = ctx!;

    let body: { payload?: PayloadAlvos };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const payload: PayloadAlvos = {
      cnpjs: Array.isArray(body.payload?.cnpjs)
        ? body.payload.cnpjs
        : Array.isArray((body as { cnpjs?: unknown }).cnpjs)
          ? (body as { cnpjs: string[] }).cnpjs
          : undefined,
      company_ids: Array.isArray(body.payload?.company_ids)
        ? body.payload.company_ids
        : Array.isArray((body as { company_ids?: unknown }).company_ids)
          ? (body as { company_ids: string[] }).company_ids
          : undefined,
      contact_ids: Array.isArray(body.payload?.contact_ids)
        ? body.payload.contact_ids
        : Array.isArray((body as { contact_ids?: unknown }).contact_ids)
          ? (body as { contact_ids: string[] }).contact_ids
          : undefined,
    };

    const alvos = deduplicar(await resolverAlvos(supabase, orgId, payload));
    const companyIds = alvos.map((a) => a.company_id);

    const funis = await listarFunis(supabase, orgId);
    const funilPadrao = funis[0]?.id ?? null;

    // Quem já tem negócio, por funil (uma empresa pode estar em funis diferentes).
    const jaExistemPorFunil: Record<string, string[]> = {};
    if (companyIds.length > 0) {
      const { data: existentes } = await supabase
        .from("lead_pipeline")
        .select("company_id, pipeline_id")
        .eq("organizacao_id", orgId)
        .in("company_id", companyIds);
      for (const l of (existentes ?? []) as Array<{ company_id: string; pipeline_id: string }>) {
        (jaExistemPorFunil[l.pipeline_id] ??= []).push(l.company_id);
      }
    }
    const jaExistem = funilPadrao ? jaExistemPorFunil[funilPadrao] ?? [] : [];

    const estagios = await listarEstagios(supabase, orgId);
    const membros = await listarMembros(supabase, orgId);

    return NextResponse.json({
      ok: true,
      selecionadas: alvos.length,
      novas: companyIds.filter((id) => !jaExistem.includes(id)).length,
      jaExistem,
      jaExistemPorFunil,
      funis: funis.map((f) => ({ id: f.id, nome: f.nome })),
      estagios: estagios.map((s) => ({
        id: s.id,
        nome: s.nome,
        cor: s.cor,
        ordem_estagio: s.ordem_estagio,
        pipeline_id: s.pipeline_id,
      })),
      membros: membros.map((m) => ({
        usuario_id: m.usuario_id,
        nome: m.nome,
        email: m.email,
      })),
    });
  } catch (erro) {
    console.error("Erro no precheck CRM:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos verificar agora." },
      { status: 500 }
    );
  }
}
