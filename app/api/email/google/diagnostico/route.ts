import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../../lib/gate";
import { limparVariavelOAuth, origemApp } from "../../../../../lib/email-oauth";

export async function GET(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const appUrl = origemApp(new URL(request.url).origin);
  const clientId = limparVariavelOAuth(process.env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = limparVariavelOAuth(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  return NextResponse.json({
    clientIdConfigurado: Boolean(clientId),
    clientSecretConfigurado: Boolean(clientSecret),
    clientIdFinal: clientId ? `${clientId.slice(0, 12)}...${clientId.slice(-8)}` : null,
    clientSecretTamanho: clientSecret.length,
    redirectUri: `${appUrl}/api/email/google/callback`,
  });
}
