import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { listarAguardando, type Post } from "./blog";
import { escaparHtml, layoutEmail, paragrafo } from "./email-layout";
import { ORIGEM_SITE } from "./seo";
import { criarClienteSupabaseAdmin } from "./supabase/admin";

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
 * - "Pedir ajustes" guarda a observação (status "ajuste"). A rotina do blog
 *   corrige o texto, marca a linha como "ajustado" e pede um novo envio:
 *   a versão corrigida ganha outro link e chega num novo e-mail.
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

type Item = { post: Post; token: string; pedidoAnterior: string | null };

export async function enviarEmailAprovacao(itens: Item[]): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave || itens.length === 0) return false;

  const blocos = itens
    .map(({ post, token, pedidoAnterior }) => {
      const url = linkRevisao(token);
      const corrigida = pedidoAnterior
        ? `<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#f4f3ef;font-size:13px;line-height:1.5;color:#4b4b53;"><strong style="color:#111114;">Versão corrigida.</strong> Você pediu: ${escaparHtml(pedidoAnterior)}</p>`
        : "";
      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e3e1db;border-radius:12px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#2442e5;">${escaparHtml(PUBLICO_IDIOMA[post.idioma] ?? post.idioma)}</p>
          <p style="margin:0 0 8px;font-size:17px;line-height:1.35;font-weight:600;color:#111114;">${escaparHtml(post.titulo)}</p>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#4b4b53;">${escaparHtml(post.descricao)}</p>
          ${corrigida}
          <a href="${url}" style="display:inline-block;padding:10px 20px;border-radius:999px;background:#2442e5;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;">Ler e aprovar &rarr;</a>
        </td></tr>
      </table>`;
    })
    .join("");

  const html = layoutEmail({
    titulo: itens.length === 1 ? "1 post esperando sua aprovação" : `${itens.length} posts esperando sua aprovação`,
    selo: "Blog de prospecção",
    corpo:
      paragrafo("Abra cada post e leia. Na página você pode <strong>Aprovar</strong>, <strong>Pedir ajustes</strong> (escreva o que mudar: eu corrijo e te mando de novo) ou <strong>Recusar</strong>. Aprovado, ele entra no site em cerca de 2 minutos.") +
      blocos +
      paragrafo(`Os links valem ${VALIDADE_DIAS} dias e são pessoais: não encaminhe este e-mail.`),
    rodape: "Enviado pela rotina automática do blog da FP Pipe.",
    urlApp: ORIGEM_SITE,
  });
  const texto = [
    "Posts esperando sua aprovação:",
    "",
    ...itens.flatMap(({ post, token, pedidoAnterior }) => [
      `[${PUBLICO_IDIOMA[post.idioma] ?? post.idioma}] ${post.titulo}${pedidoAnterior ? " (versão corrigida)" : ""}`,
      linkRevisao(token),
      "",
    ]),
    `Os links valem ${VALIDADE_DIAS} dias. Não encaminhe este e-mail.`,
  ].join("\n");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FP Pipe Blog <avisos@fppipe.com.br>",
        to: [EMAIL_APROVACAO],
        subject: itens.every((i) => i.pedidoAnterior)
          ? `📝 Blog: ${itens.length === 1 ? "versão corrigida" : `${itens.length} versões corrigidas`} para aprovar`
          : `📝 Blog: ${itens.length} ${itens.length === 1 ? "post" : "posts"} para aprovar`,
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

type Resultado = { status: number; corpo: Record<string, unknown> };

/**
 * Cria um link para cada post "aguardando" sem pedido ativo e manda UM
 * e-mail com todos. Usado pelo cron diário e pela rotina do blog.
 */
export async function enviarPedidosPendentes(): Promise<Resultado> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { status: 500, corpo: { erro: "Banco não configurado." } };

  const limite = new Date(Date.now() - VALIDADE_DIAS * 86400000).toISOString().slice(0, 10);
  const candidatos = listarAguardando().filter((p) => p.data >= limite);
  if (candidatos.length === 0) return { status: 200, corpo: { ok: true, enviados: 0 } };

  const { data: linhas, error } = await admin
    .from("blog_aprovacoes")
    .select("blog, idioma, slug, status, observacao, decidido_em")
    .in("slug", candidatos.map((p) => p.slug));
  if (error) return { status: 500, corpo: { erro: "Falha ao ler aprovações." } };

  const chave = (l: { blog: string; idioma: string; slug: string }) => `${l.blog}/${l.idioma}/${l.slug}`;
  const ativos = new Set((linhas ?? []).filter((l) => l.status !== "ajustado").map(chave));
  // Última observação de ajuste já atendida (para mostrar "Você pediu: …").
  const pedidos = new Map<string, { obs: string; quando: string }>();
  for (const l of linhas ?? []) {
    if (l.status !== "ajustado" || !l.observacao) continue;
    const atual = pedidos.get(chave(l));
    if (!atual || (l.decidido_em ?? "") > atual.quando) pedidos.set(chave(l), { obs: l.observacao, quando: l.decidido_em ?? "" });
  }

  const itens: Item[] = [];
  for (const post of candidatos.filter((p) => !ativos.has(chave(p)))) {
    const { token, hash } = novoToken();
    const { error: erroInsert } = await admin.from("blog_aprovacoes").insert({
      blog: post.blog,
      idioma: post.idioma,
      slug: post.slug,
      titulo: post.titulo.slice(0, 200),
      token_hash: hash,
      expira_em: new Date(Date.now() + VALIDADE_DIAS * 86400000).toISOString(),
    });
    if (!erroInsert) itens.push({ post, token, pedidoAnterior: pedidos.get(chave(post))?.obs.slice(0, 400) ?? null });
  }
  if (itens.length === 0) return { status: 200, corpo: { ok: true, enviados: 0 } };

  if (!(await enviarEmailAprovacao(itens))) {
    // Sem e-mail, desfaz os pedidos para tentar de novo depois.
    for (const { post } of itens) {
      await admin.from("blog_aprovacoes").delete().match({ blog: post.blog, idioma: post.idioma, slug: post.slug, status: "pendente" });
    }
    return { status: 502, corpo: { erro: "E-mail não enviado." } };
  }
  return { status: 200, corpo: { ok: true, enviados: itens.length } };
}
