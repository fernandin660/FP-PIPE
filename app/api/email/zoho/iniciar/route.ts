import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { exigirAcesso } from "../../../../../lib/gate";
import { assinarEstado, origemApp } from "../../../../../lib/email-oauth";

export async function GET(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const clientId = (process.env.ZOHO_OAUTH_CLIENT_ID ?? "").trim();
  if (!clientId) return NextResponse.json({ erro: "Integração Zoho ainda não configurada." }, { status: 503 });
  const estado = `${gate.ctx!.usuarioId}.${gate.ctx!.orgId}.${crypto.randomBytes(18).toString("hex")}`;
  const appUrl = origemApp(new URL(request.url).origin);
  const url = new URL("https://accounts.zoho.com/oauth/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", `${appUrl.replace(/\/$/, "")}/api/email/zoho/callback`);
  url.searchParams.set("scope", "ZohoMail.accounts.READ,ZohoMail.messages.CREATE");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", `${Buffer.from(estado).toString("base64url")}.${assinarEstado(estado)}`);
  return NextResponse.redirect(url);
}
