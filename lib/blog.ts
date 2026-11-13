import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Marked, type Tokens } from "marked";
import type { Idioma } from "../components/studio/dicionario";

/*
 * Blogs da FP Pipe, guardados como arquivos Markdown no repositório:
 *
 *   conteudo/blog/<blog>/<idioma>/<slug>.md
 *
 *   blog:   "sites"      → criação de sites (site do estúdio, /blog)
 *           "prospeccao" → prospecção, vendas e leads (/plataforma/blog)
 *   idioma: pt | fr | en | es
 *
 * Sem painel na internet: publicar é aprovar o arquivo (revisão + deploy).
 * Rascunhos (status: rascunho) só aparecem nas prévias da Vercel, nunca no
 * site oficial, e mesmo lá ficam com "noindex".
 *
 * status: aguardando → post escrito pela rotina automática, esperando o
 * "Aprovar" do e-mail. Vira público quando a aprovação está no banco: o
 * build lê a lista (scripts/blog-aprovados.mjs → conteudo/blog/.aprovados.json).
 */

export const BLOGS = ["sites", "prospeccao"] as const;
export type Blog = (typeof BLOGS)[number];

export type Autor = { chave: string; nome: string };
export const AUTORES: Record<string, Autor> = {
  fernando: { chave: "fernando", nome: "Fernando Pugliesi" },
  larissa: { chave: "larissa", nome: "Larissa" },
  equipe: { chave: "equipe", nome: "FP Pipe" },
};

export type Post = {
  blog: Blog;
  idioma: Idioma;
  slug: string;
  titulo: string;
  descricao: string;
  data: string; // AAAA-MM-DD
  atualizado: string | null;
  autor: Autor;
  categoria: string | null;
  /** Chave comum às traduções do mesmo post (liga as versões no hreflang). */
  traducao: string;
  rascunho: boolean;
  /** Escrito pela rotina automática e ainda sem a aprovação por e-mail. */
  aguardando: boolean;
  minutosLeitura: number;
  html: string;
  sumario: { id: string; texto: string }[];
};

const RAIZ = path.join(process.cwd(), "conteudo", "blog");
const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/** Prévias da Vercel (e o ambiente local) mostram rascunhos; produção não. */
export function mostrarRascunhos(): boolean {
  return process.env.VERCEL_ENV !== "production" && process.env.BLOG_ESCONDER_RASCUNHOS !== "1";
}

/* ---------- caminhos ---------- */

export function caminhoBlog(blog: Blog, idioma: Idioma, slug?: string): string {
  const base =
    blog === "sites"
      ? idioma === "pt"
        ? "/blog"
        : `/${idioma}/blog`
      : idioma === "pt"
        ? "/plataforma/blog"
        : `/${idioma}/plataforma/blog`;
  return slug ? `${base}/${slug}` : base;
}

/* ---------- leitura dos arquivos ---------- */

/** Cabeçalho simples "chave: valor" entre linhas "---" (sem YAML completo de propósito). */
function lerCabecalho(bruto: string): { campos: Record<string, string>; corpo: string } {
  const m = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { campos: {}, corpo: bruto };
  const campos: Record<string, string> = {};
  for (const linha of m[1].split(/\r?\n/)) {
    const i = linha.indexOf(":");
    if (i <= 0) continue;
    const chave = linha.slice(0, i).trim();
    let valor = linha.slice(i + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1);
    campos[chave] = valor;
  }
  return { campos, corpo: m[2] };
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** HTML do título → texto puro (o React escapa de novo ao exibir). */
function textoPlano(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function idDeTitulo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Markdown → HTML com segurança:
 * - HTML escrito dentro do texto é mostrado como texto (nunca executado);
 * - links só http(s), e-mail, telefone ou caminhos do próprio site;
 * - links externos abrem em nova aba sem passar referência;
 * - imagens só do próprio site ou https, com carregamento preguiçoso.
 */
function converter(markdown: string) {
  const sumario: { id: string; texto: string }[] = [];
  const usados = new Map<string, number>();
  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag) {
        return escapar(token.text);
      },
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const interno = this.parser.parseInline(token.tokens);
        const nivel = Math.min(Math.max(token.depth, 2), 4); // o título do post é o único <h1>
        let id = idDeTitulo(interno) || "secao";
        const n = usados.get(id) ?? 0;
        usados.set(id, n + 1);
        if (n) id = `${id}-${n + 1}`;
        if (nivel === 2) sumario.push({ id, texto: textoPlano(interno) });
        return `<h${nivel} id="${id}">${interno}</h${nivel}>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Link) {
        const texto = this.parser.parseInline(token.tokens);
        const href = token.href.trim();
        const seguro = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(href);
        if (!seguro) return texto;
        const externo = /^https?:\/\//i.test(href) && !/^https?:\/\/(www\.)?fppipe\.com\.br/i.test(href);
        const titulo = token.title ? ` title="${escapar(token.title)}"` : "";
        return externo
          ? `<a href="${escapar(href)}"${titulo} target="_blank" rel="noopener noreferrer">${texto}</a>`
          : `<a href="${escapar(href)}"${titulo}>${texto}</a>`;
      },
      image(token: Tokens.Image) {
        const src = token.href.trim();
        if (!/^(https:\/\/|\/(?!\/))/i.test(src)) return "";
        return `<img src="${escapar(src)}" alt="${escapar(token.text)}" loading="lazy" decoding="async" />`;
      },
    },
  });
  const html = md.parse(markdown, { async: false }) as string;
  return { html, sumario };
}

/** Posts "aguardando" já aprovados por e-mail (gerado no build). */
function aprovados(): Set<string> {
  try {
    const lista = JSON.parse(fs.readFileSync(path.join(RAIZ, ".aprovados.json"), "utf8"));
    if (!Array.isArray(lista)) return new Set();
    return new Set(lista.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function chaveAprovacao(blog: string, idioma: string, slug: string): string {
  return `${blog}/${idioma}/${slug}`;
}

let cache: Post[] | null = null;

function carregarTudo(): Post[] {
  if (cache) return cache;
  const ok = aprovados();
  const posts: Post[] = [];
  for (const blog of BLOGS) {
    for (const idioma of ["pt", "fr", "en", "es"] as Idioma[]) {
      const pasta = path.join(RAIZ, blog, idioma);
      if (!fs.existsSync(pasta)) continue;
      for (const arquivo of fs.readdirSync(pasta)) {
        if (!arquivo.endsWith(".md")) continue;
        const slug = arquivo.slice(0, -3);
        if (!SLUG_VALIDO.test(slug)) throw new Error(`Blog: nome de arquivo inválido ${blog}/${idioma}/${arquivo}`);
        const { campos, corpo } = lerCabecalho(fs.readFileSync(path.join(pasta, arquivo), "utf8"));
        const obrigatorios = ["titulo", "descricao", "data"];
        for (const c of obrigatorios) if (!campos[c]) throw new Error(`Blog: falta "${c}" em ${blog}/${idioma}/${arquivo}`);
        if (!DATA_VALIDA.test(campos.data)) throw new Error(`Blog: data inválida em ${blog}/${idioma}/${arquivo}`);
        const status = campos.status ?? "rascunho";
        const aguardando = status === "aguardando" && !ok.has(chaveAprovacao(blog, idioma, slug));
        const { html, sumario } = converter(corpo);
        const palavras = corpo.split(/\s+/).filter(Boolean).length;
        posts.push({
          blog,
          idioma,
          slug,
          titulo: campos.titulo,
          descricao: campos.descricao,
          data: campos.data,
          atualizado: campos.atualizado && DATA_VALIDA.test(campos.atualizado) ? campos.atualizado : null,
          autor: AUTORES[campos.autor ?? ""] ?? AUTORES.equipe,
          categoria: campos.categoria || null,
          traducao: campos.traducao || slug,
          rascunho: !(status === "publicado" || (status === "aguardando" && !aguardando)),
          aguardando,
          minutosLeitura: Math.max(1, Math.round(palavras / 220)),
          html,
          sumario,
        });
      }
    }
  }
  cache = posts.sort((a, b) => b.data.localeCompare(a.data) || a.titulo.localeCompare(b.titulo));
  return cache;
}

/** Posts visíveis neste ambiente (sem rascunhos em produção). */
export function listarPosts(blog: Blog, idioma: Idioma): Post[] {
  const ver = mostrarRascunhos();
  return carregarTudo().filter((p) => p.blog === blog && p.idioma === idioma && (ver || !p.rascunho));
}

export function todosPublicados(): Post[] {
  return carregarTudo().filter((p) => !p.rascunho);
}

export function buscarPost(blog: Blog, idioma: Idioma, slug: string): Post | null {
  return listarPosts(blog, idioma).find((p) => p.slug === slug) ?? null;
}

/** Versões do mesmo post em outros idiomas (só as visíveis neste ambiente). */
export function traducoes(post: Post): Partial<Record<Idioma, Post>> {
  const ver = mostrarRascunhos();
  const out: Partial<Record<Idioma, Post>> = {};
  for (const p of carregarTudo()) {
    if (p.blog === post.blog && p.traducao === post.traducao && (ver || !p.rascunho)) out[p.idioma] = p;
  }
  return out;
}

/** Qualquer post, visível ou não (para a tela de revisão por link secreto). */
export function buscarQualquer(blog: Blog, idioma: Idioma, slug: string): Post | null {
  return carregarTudo().find((p) => p.blog === blog && p.idioma === idioma && p.slug === slug) ?? null;
}

/** Posts da rotina automática esperando aprovação. */
export function listarAguardando(): Post[] {
  return carregarTudo().filter((p) => p.aguardando);
}
