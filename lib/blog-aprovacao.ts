import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Post } from "./blog";
import { escaparHtml, layoutEmail, paragrafo } from "./email-layout";
import { ORIGEM_SITE } from "./seo";

/*
 * Aprovação dos posts automáticos por e-mail.
 *
 * - Cada post "aguardando" ganha um link secreto (32 bytes aleatórios).
 *   O banco guarda só o hash SHA-256: quem lê o banco não consegue aprovar.
 * - O link abre uma página de revisão; aprovar/recusar é um botão (POST).
 *   Assim os antivírus de e-mail que "abrem" os links sozinhos não
 *   conseguem aprovar nada por engano.
 * - O link vale 14 dias e só pode decidir uma vez.
 * - Aprovar chama o Deploy Hook da Vercel: o site é gerado de novo e o
 *   post aparece em ~2 minutos.
 */

export const VALIDADE_DIAS = 14;
export const EMAIL_APROVACAO = process.env.BLOG_APROVACAO_EMAIL ?? process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br";

export const PUBLICO_IDIOMA: Record<string, string> = {
  pt: "Português · Brasil e Portugal",
  fr: "Français · France",
  en: "English · Reino Unido e EUA",
  es: "Español · España y América Latina",
};

export function novoToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Formato do token gerado acima (evita consultas ao banco com lixo). */
export function tokenValido(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function linkRevisao(token: string): string {
  return `${ORIGEM_SITE}/revisao-blog?t=${encodeURIComponent(token)}`;
}

/** Dispara um novo deploy de produção (Deploy Hook da Vercel). */
export async function publicarSite(): Promise<boolean> {
  const gancho = process.env.BLOG_DEPLOY_HOOK_URL;
  if (!gancho || !/^https:\/\/api\.vercel\.com\//.test(gancho)) return false;
  try {
    const r = await fetch(gancho, { method: "POST", signal: AbortSignal.timeout(10000) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function enviarEmailAprovacao(itens: { post: Post; token: string }[]): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave || itens.length === 0) return false;

  const blocos = itens
    .map(({ post, token }) => {
      const url = linkRevisao(token);
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e3e1db;border-radius:12px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#2442e5;">${escaparHtml(PUBLICO_IDIOMA[post.idioma] ?? post.idioma)}</p>
          <p style="margin:0 0 8px;font-size:17px;line-height:1.35;font-weight:600;color:#111114;">${escaparHtml(post.titulo)}</p>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#4b4b53;">${escaparHtml(post.descricao)}</p>
          <a href="${url}" style="display:inline-block;padding:10px 20px;border-radius:999px;background:#2442e5;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">Ler e aprovar &rarr;</a>
        </td></tr>
      </table>`;
    })
    .join("");

  const html = layoutEmail({
    titulo: itens.length === 1 ? "1 post esperando sua aprovação" : `${itens.length} posts esperando sua aprovação`,
    selo: "Blog de prospecção",
    corpo:
      paragrafo("Abra cada post, leia e clique em <strong>Aprovar</strong> ou <strong>Recusar</strong>. Aprovado, ele entra no site em cerca de 2 minutos.") +
      blocos +
      paragrafo(`Os links valem ${VALIDADE_DIAS} dias e são pessoais: não encaminhe este e-mail.`),
    rodape: "Enviado pela rotina automática do blog da FP Pipe.",
    urlApp: ORIGEM_SITE,
  });
  const texto = [
    "Posts esperando sua aprovação:",
    "",
    ...itens.flatMap(({ post, token }) => [`[${PUBLICO_IDIOMA[post.idioma] ?? post.idioma}] ${post.titulo}`, linkRevisao(token), ""]),
    `Os links valem ${VALIDADE_DIAS} dias. Não encaminhe este e-mail.`,
  ].join("\n");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FP Pipe Blog <avisos@fppipe.com.br>",
        to: [EMAIL_APROVACAO],
        subject: `📝 Blog: ${itens.length} ${itens.length === 1 ? "post novo" : "posts novos"} para aprovar`,
        text: texto,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) console.error("Blog aprovação: Resend respondeu", r.status);
    return r.ok;
  } catch {
    return false;
  }
}
