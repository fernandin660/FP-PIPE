import { NextResponse } from "next/server";

import { criptografarToken, assinarEstado } from "../../../../../lib/email-oauth";
import { criarClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function GET(request: Request) {
  const origem = new URL(request.url).origin;
  const url = new URL(request.url);
  const estadoBruto = url.searchParams.get("state") ?? "";
  const [estadoCodificado, assinatura] = estadoBruto.split(".");
  let estado = "";
  try { estado = Buffer.from(estadoCodificado, "base64url").toString("utf8"); } catch {}
  const [usuarioId, orgId] = estado.split(".");
  if (!usuarioId || !orgId || assinarEstado(estado) !== assinatura) {
    return NextResponse.redirect(`${origem}/disparos?email=estado_invalido`);
  }

  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origem}/disparos?email=cancelado`);
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = `${origem}/api/email/google/callback`;
  const tokenResposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  if (!tokenResposta.ok) return NextResponse.redirect(`${origem}/disparos?email=erro_token`);
  const tokens = await tokenResposta.json() as { access_token?: string; refresh_token?: string; scope?: string };
  if (!tokens.refresh_token) return NextResponse.redirect(`${origem}/disparos?email=sem_refresh_token`);
  const perfilResposta = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token ?? ""}` } });
  const perfil = await perfilResposta.json() as { email?: string };
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.redirect(`${origem}/disparos?email=erro_banco`);
  const { data: membro } = await admin
    .from("organizacao_membros")
    .select("usuario_id")
    .eq("usuario_id", usuarioId)
    .eq("organizacao_id", orgId)
    .eq("status", "ativo")
    .maybeSingle();
  if (!membro) return NextResponse.redirect(`${origem}/disparos?email=organizacao_invalida`);

  const { error } = await admin.from("email_conexoes").upsert({ usuario_id: usuarioId, organizacao_id: orgId, provedor: "google", email: perfil.email ?? "Google conectado", refresh_token_criptografado: criptografarToken(tokens.refresh_token), escopos: (tokens.scope ?? "").split(" ").filter(Boolean), atualizado_em: new Date().toISOString() }, { onConflict: "usuario_id" });
  if (error) {
    console.error("Erro ao salvar conexão Google:", error);
    return NextResponse.redirect(`${origem}/disparos?email=erro_salvar`);
  }
  return NextResponse.redirect(`${origem}/disparos?email=conectado`);
}
