import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { descriptografarToken, limparVariavelOAuth } from "../../../../lib/email-oauth";

export const runtime = "nodejs";
export const maxDuration = 60;

function base64Url(valor: string): string {
  return Buffer.from(valor).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function substituir(template: string, alvo: { nome?: string | null; empresa?: string | null; cargo?: string | null }): string {
  return template
    .replaceAll("{nome}", alvo.nome || "time")
    .replaceAll("{empresa}", alvo.empresa || "sua empresa")
    .replaceAll("{cargo}", alvo.cargo || "")
    .replaceAll("[Seu Nome]", "")
    .replaceAll("[Seu Contato]", "")
    .replaceAll("[Nome da Empresa]", alvo.empresa || "sua empresa");
}

async function obterToken(refreshToken: string): Promise<string> {
  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: limparVariavelOAuth(process.env.GOOGLE_OAUTH_CLIENT_ID), client_secret: limparVariavelOAuth(process.env.GOOGLE_OAUTH_CLIENT_SECRET), refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!resposta.ok) throw new Error("Não foi possível renovar a conexão Gmail.");
  const dados = await resposta.json() as { access_token?: string };
  if (!dados.access_token) throw new Error("Gmail não retornou um token de envio.");
  return dados.access_token;
}

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, usuarioId, orgId } = gate.ctx!;
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco indisponível." }, { status: 503 });
  const corpo = (await request.json().catch(() => null)) as { campanhaId?: unknown } | null;
  const campanhaId = String(corpo?.campanhaId ?? "");
  const { data: campanha } = await supabase.from("campanhas").select("id, assunto, corpo, status").eq("id", campanhaId).eq("organizacao_id", orgId).maybeSingle();
  if (!campanha) return NextResponse.json({ erro: "Campanha não encontrada." }, { status: 404 });
  if (!campanha.assunto || !campanha.corpo) return NextResponse.json({ erro: "Gere e salve a mensagem antes de enviar." }, { status: 400 });

  const { data: conexao } = await admin.from("email_conexoes").select("email, refresh_token_criptografado").eq("usuario_id", usuarioId).maybeSingle();
  if (!conexao) return NextResponse.json({ erro: "Conecte sua conta Gmail antes de enviar." }, { status: 400 });
  const { data: destinatarios } = await supabase.from("campanha_destinatarios").select("id, email, nome, empresa, cargo, status").eq("campanha_id", campanhaId).eq("organizacao_id", orgId).eq("status", "nao_contatado").limit(25);
  if (!destinatarios?.length) return NextResponse.json({ erro: "A campanha não possui destinatários pendentes." }, { status: 400 });

  let token: string;
  try { token = await obterToken(descriptografarToken(conexao.refresh_token_criptografado)); } catch (erro) { return NextResponse.json({ erro: erro instanceof Error ? erro.message : "Conexão Gmail inválida." }, { status: 400 }); }
  await supabase.from("campanhas").update({ status: "enviando", atualizado_em: new Date().toISOString() }).eq("id", campanhaId);
  let enviados = 0;
  for (const destinatario of destinatarios) {
    const raw = [`To: ${destinatario.email}`, `Subject: ${substituir(campanha.assunto, destinatario)}`, "Content-Type: text/plain; charset=utf-8", "", substituir(campanha.corpo, destinatario)].join("\r\n");
    try {
      const resposta = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: base64Url(raw) }) });
      if (!resposta.ok) throw new Error(`Gmail ${resposta.status}`);
      await supabase.from("campanha_destinatarios").update({ status: "enviado", enviado_em: new Date().toISOString(), erro: null }).eq("id", destinatario.id);
      enviados++;
    } catch (erroEnvio) {
      await supabase.from("campanha_destinatarios").update({ status: "falhou", erro: erroEnvio instanceof Error ? erroEnvio.message : "Falha no envio." }).eq("id", destinatario.id);
    }
  }
  await supabase.from("campanhas").update({ status: enviados === destinatarios.length ? "enviada" : "pronta", atualizado_em: new Date().toISOString() }).eq("id", campanhaId);
  const { count: pendentes } = await supabase
    .from("campanha_destinatarios")
    .select("id", { count: "exact", head: true })
    .eq("campanha_id", campanhaId)
    .eq("organizacao_id", orgId)
    .eq("status", "nao_contatado");
  return NextResponse.json({ enviados, falhas: destinatarios.length - enviados, pendentes: pendentes ?? 0 });
}
