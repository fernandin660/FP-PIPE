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
  if (!segredo) throw new Error("EMAIL_OAUTH_SECRET não configurado.");
  return crypto.createHmac("sha256", segredo).update(valor).digest("base64url");
}

const VALIDADE_ESTADO_MS = 15 * 60 * 1000;

/** Gera o parâmetro `state` assinado (usuário, org, horário e nonce). */
export function criarEstadoOAuth(usuarioId: string, orgId: string): string {
  const estado = `${usuarioId}.${orgId}.${Date.now()}.${crypto.randomBytes(18).toString("hex")}`;
  return `${Buffer.from(estado).toString("base64url")}.${assinarEstado(estado)}`;
}

/**
 * Valida o `state` devolvido pelo provedor: assinatura, validade (15 min)
 * e — essencial contra OAuth CSRF — que quem está concluindo o fluxo é o
 * MESMO usuário logado que o iniciou. Sem isso, um atacante podia mandar
 * o link de consentimento para uma vítima e conectar a caixa de e-mail
 * dela na conta do atacante.
 */
export async function validarEstadoOAuth(
  estadoBruto: string
): Promise<{ usuarioId: string; orgId: string } | null> {
  if (!segredo) return null;
  const [estadoCodificado, assinatura] = estadoBruto.split(".");
  if (!estadoCodificado || !assinatura) return null;
  let estado = "";
  try {
    estado = Buffer.from(estadoCodificado, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const esperado = Buffer.from(assinarEstado(estado));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) {
    return null;
  }
  const [usuarioId, orgId, ts] = estado.split(".");
  const emitidoEm = Number(ts);
  if (!usuarioId || !orgId || !Number.isFinite(emitidoEm)) return null;
  if (Date.now() - emitidoEm > VALIDADE_ESTADO_MS) return null;

  const { criarClienteSupabaseServidor } = await import("./supabase/server");
  const supabase = await criarClienteSupabaseServidor();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== usuarioId) return null;

  return { usuarioId, orgId };
}

// Origem canônica para redirect_uri e redirecionamentos de retorno.
// Consistente entre iniciar/callback para não ocorrer redirect_uri_mismatch
// em previews ou domínio custom (falha oauth conhecida antes da unificação).
export function origemApp(requestOrigin: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_ENV === "production" ? "https://www.fppipe.com.br" : requestOrigin)).replace(/\/$/, "");
}
