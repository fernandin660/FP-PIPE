import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { exigirAcesso } from "../../../../../lib/gate";
import { assinarEstado, limparVariavelOAuth } from "../../../../../lib/email-oauth";

export async function GET(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const clientId = limparVariavelOAuth(process.env.GOOGLE_OAUTH_CLIENT_ID);
  if (!clientId) return NextResponse.json({ erro: "Integração Gmail ainda não configurada." }, { status: 503 });

  const nonce = crypto.randomBytes(18).toString("hex");
  const estado = `${gate.ctx!.usuarioId}.${gate.ctx!.orgId}.${nonce}`;
  const assinatura = assinarEstado(estado);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_ENV === "production" ? "https://www.fppipe.com.br" : new URL(request.url).origin);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appUrl.replace(/\/$/, "")}/api/email/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", `${Buffer.from(estado).toString("base64url")}.${assinatura}`);
  return NextResponse.redirect(url);
}
