import { NextResponse } from "next/server";
import { criptografarToken, assinarEstado, limparVariavelOAuth, origemApp } from "../../../../../lib/email-oauth";
import { criarClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function GET(request: Request) {
  const origem = origemApp(new URL(request.url).origin);
  const url = new URL(request.url);
  const [estadoCodificado, assinatura] = (url.searchParams.get("state") ?? "").split(".");
  let estado = "";
  try { estado = Buffer.from(estadoCodificado, "base64url").toString("utf8"); } catch {}
  const [usuarioId, orgId] = estado.split(".");
  if (!usuarioId || !orgId || assinarEstado(estado) !== assinatura) return NextResponse.redirect(`${origem}/disparos?email=estado_invalido`);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origem}/disparos?email=cancelado`);
  const clientId = limparVariavelOAuth(process.env.MICROSOFT_OAUTH_CLIENT_ID);
  const clientSecret = limparVariavelOAuth(process.env.MICROSOFT_OAUTH_CLIENT_SECRET);
  const redirectUri = `${origem}/api/email/microsoft/callback`;
  const resposta = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", scope: "openid profile email offline_access User.Read Mail.Send" }), signal: AbortSignal.timeout(15000) });
  if (!resposta.ok) { console.error("Erro token Microsoft:", await resposta.text()); return NextResponse.redirect(`${origem}/disparos?email=erro_token`); }
  const tokens = await resposta.json() as { access_token?: string; refresh_token?: string; scope?: string };
  if (!tokens.refresh_token || !tokens.access_token) return NextResponse.redirect(`${origem}/disparos?email=sem_refresh_token`);
  const perfilResposta = await fetch("https://graph.microsoft.com/v1.0/me", { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(10000) });
  const perfil = await perfilResposta.json() as { mail?: string; userPrincipalName?: string };
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.redirect(`${origem}/disparos?email=erro_banco`);
  const { error } = await admin.from("email_conexoes").upsert({ usuario_id: usuarioId, organizacao_id: orgId, provedor: "microsoft", email: perfil.mail ?? perfil.userPrincipalName ?? "Outlook conectado", refresh_token_criptografado: criptografarToken(tokens.refresh_token), escopos: (tokens.scope ?? "").split(" ").filter(Boolean), atualizado_em: new Date().toISOString() }, { onConflict: "usuario_id" });
  if (error) { console.error("Erro ao salvar conexão Microsoft:", error); return NextResponse.redirect(`${origem}/disparos?email=erro_salvar`); }
  return NextResponse.redirect(`${origem}/disparos?email=conectado`);
}
