import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { exigirAcesso } from "../../../../../lib/gate";
import { assinarEstado } from "../../../../../lib/email-oauth";

export async function GET(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const clientId = (process.env.MICROSOFT_OAUTH_CLIENT_ID ?? "").trim();
  if (!clientId) return NextResponse.json({ erro: "Integração Outlook ainda não configurada." }, { status: 503 });
  const estado = `${gate.ctx!.usuarioId}.${gate.ctx!.orgId}.${crypto.randomBytes(18).toString("hex")}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_ENV === "production" ? "https://www.fppipe.com.br" : new URL(request.url).origin);
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", `${appUrl.replace(/\/$/, "")}/api/email/microsoft/callback`);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email offline_access User.Read Mail.Send");
  url.searchParams.set("state", `${Buffer.from(estado).toString("base64url")}.${assinarEstado(estado)}`);
  return NextResponse.redirect(url);
}
