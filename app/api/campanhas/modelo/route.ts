import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, usuarioId, orgId } = gate.ctx!;
  const corpo = (await request.json().catch(() => null)) as { campanhaId?: unknown; nome?: unknown; assunto?: unknown; texto?: unknown } | null;
  const campanhaId = String(corpo?.campanhaId ?? "");
  const nome = String(corpo?.nome ?? "").trim();
  if (!campanhaId || !nome) return NextResponse.json({ erro: "Informe o nome do modelo." }, { status: 400 });
  const { data: campanha } = await supabase.from("campanhas").select("assunto, corpo, objetivo").eq("id", campanhaId).eq("organizacao_id", orgId).maybeSingle();
  const assunto = String(corpo?.assunto ?? campanha?.assunto ?? "").trim();
  const texto = String(corpo?.texto ?? campanha?.corpo ?? "").trim();
  if (!texto) return NextResponse.json({ erro: "Gere uma abordagem antes de salvar o modelo." }, { status: 400 });
  const { data, error } = await supabase.from("modelos").insert({ usuario_id: usuarioId, nome, canal: "email", objetivo: campanha?.objetivo ?? "gerar_interesse", produto: null, argumento: null, assunto, conteudo: texto }).select("id, nome").single();
  if (error || !data) return NextResponse.json({ erro: "Não foi possível salvar o modelo." }, { status: 500 });
  return NextResponse.json({ modelo: data });
}
