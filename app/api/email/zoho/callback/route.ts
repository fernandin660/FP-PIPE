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
  const clientId = limparVariavelOAuth(process.env.ZOHO_OAUTH_CLIENT_ID);
  const clientSecret = limparVariavelOAuth(process.env.ZOHO_OAUTH_CLIENT_SECRET);
  const redirectUri = `${origem}/api/email/zoho/callback`;
  const resposta = await fetch("https://accounts.zoho.com/oauth/v2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }), signal: AbortSignal.timeout(15000) });
  if (!resposta.ok) { console.error("Erro token Zoho:", await resposta.text()); return NextResponse.redirect(`${origem}/disparos?email=erro_token`); }
  const tokens = await resposta.json() as { access_token?: string; refresh_token?: string; scope?: string };
  if (!tokens.refresh_token || !tokens.access_token) return NextResponse.redirect(`${origem}/disparos?email=sem_refresh_token`);
  const contasResposta = await fetch("https://mail.zoho.com/api/accounts", { headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` }, signal: AbortSignal.timeout(10000) });
  const contas = await contasResposta.json() as { data?: Array<{ accountId?: string; emailAddress?: unknown }> };
  const conta = contas.data?.[0];
  if (!conta?.accountId) return NextResponse.redirect(`${origem}/disparos?email=zoho_sem_conta`);
  const enderecos = Array.isArray(conta.emailAddress)
    ? conta.emailAddress as Array<{ mailId?: string; isPrimary?: boolean }>
    : [];
  const enderecoPrincipal = enderecos.find((endereco) => endereco.isPrimary && endereco.mailId)?.mailId
    ?? enderecos.find((endereco) => endereco.mailId)?.mailId
    ?? (typeof conta.emailAddress === "string" ? conta.emailAddress : "");
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.redirect(`${origem}/disparos?email=erro_banco`);
  const { error } = await admin.from("email_conexoes").upsert({ usuario_id: usuarioId, organizacao_id: orgId, provedor: "zoho", account_id: conta.accountId, email: enderecoPrincipal || "Zoho conectado", refresh_token_criptografado: criptografarToken(tokens.refresh_token), escopos: (tokens.scope ?? "").split(",").filter(Boolean), atualizado_em: new Date().toISOString() }, { onConflict: "usuario_id" });
  if (error) { console.error("Erro ao salvar conexão Zoho:", error); return NextResponse.redirect(`${origem}/disparos?email=erro_salvar`); }
  return NextResponse.redirect(`${origem}/disparos?email=conectado`);
}
