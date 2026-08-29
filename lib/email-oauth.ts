import crypto from "node:crypto";

const segredo = process.env.EMAIL_OAUTH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function limparVariavelOAuth(valor: string | undefined): string {
  return (valor ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function chave(): Buffer {
  return crypto.createHash("sha256").update(segredo).digest();
}

export function criptografarToken(token: string): string {
  if (!segredo) throw new Error("EMAIL_OAUTH_SECRET não configurado.");
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const texto = Buffer.concat([cifra.update(token, "utf8"), cifra.final()]);
  return [iv.toString("base64url"), cifra.getAuthTag().toString("base64url"), texto.toString("base64url")].join(".");
}

export function descriptografarToken(valor: string): string {
  if (!segredo) throw new Error("EMAIL_OAUTH_SECRET não configurado.");
  const [ivTexto, tagTexto, texto] = valor.split(".");
  const decifra = crypto.createDecipheriv("aes-256-gcm", chave(), Buffer.from(ivTexto, "base64url"));
  decifra.setAuthTag(Buffer.from(tagTexto, "base64url"));
  return Buffer.concat([decifra.update(Buffer.from(texto, "base64url")), decifra.final()]).toString("utf8");
}

export function assinarEstado(valor: string): string {
  return crypto.createHmac("sha256", segredo).update(valor).digest("base64url");
}

// Origem canônica para redirect_uri e redirecionamentos de retorno.
// Consistente entre iniciar/callback para não ocorrer redirect_uri_mismatch
// em previews ou domínio custom (falha oauth conhecida antes da unificação).
export function origemApp(requestOrigin: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_ENV === "production" ? "https://www.fppipe.com.br" : requestOrigin)).replace(/\/$/, "");
}
