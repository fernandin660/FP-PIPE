import type { MetadataRoute } from "next";
import { ORIGEM_SITE } from "../lib/seo";
import { BLOGS, caminhoBlog, todosPublicados, type Post } from "../lib/blog";
import { IDIOMAS } from "../components/studio/dicionario";

/*
 * Mapa do site para o Google e o Bing: só páginas públicas. Telas do sistema
 * ficam de fora (e recebem "noindex" pelo cabeçalho, ver next.config.ts).
 * Cada página aponta para as versões nos outros idiomas (hreflang).
 */

type Entrada = MetadataRoute.Sitemap[number];

const url = (caminho: string) => `${ORIGEM_SITE}${caminho}`;

function comIdiomas(
  caminhos: { pt: string; fr: string; en: string; es: string },
  prioridade: number,
  frequencia: Entrada["changeFrequency"]
): Entrada[] {
  const languages = {
    "pt-BR": url(caminhos.pt),
    fr: url(caminhos.fr),
    en: url(caminhos.en),
    es: url(caminhos.es),
    "x-default": url(caminhos.pt),
  };
  return (Object.values(caminhos) as string[]).map((c) => ({
    url: url(c),
    changeFrequency: frequencia,
    priority: prioridade,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // Site do estúdio (criação de sites)
    ...comIdiomas({ pt: "/", fr: "/fr", en: "/en", es: "/es" }, 1, "weekly"),
    // Plataforma de prospecção e CRM
    ...comIdiomas(
      { pt: "/plataforma", fr: "/fr/plataforma", en: "/en/plataforma", es: "/es/plataforma" },
      0.9,
      "weekly"
    ),
    { url: url("/planos"), changeFrequency: "monthly", priority: 0.7 },
    // Páginas legais
    ...comIdiomas(
      { pt: "/privacidade", fr: "/fr/confidentialite", en: "/en/confidentialite", es: "/es/confidentialite" },
      0.2,
      "yearly"
    ),
    { url: url("/termos"), changeFrequency: "yearly", priority: 0.2 },
    ...entradasBlog(),
  ];
}

const LANG: Record<string, string> = { pt: "pt-BR", fr: "fr", en: "en", es: "es" };

/** Índices dos blogs (só idiomas com artigo publicado) e cada artigo publicado — rascunhos nunca entram. */
function entradasBlog(): Entrada[] {
  const publicados = todosPublicados();
  const out: Entrada[] = [];
  for (const blog of BLOGS) {
    const idiomas = IDIOMAS.filter((l) => publicados.some((p) => p.blog === blog && p.idioma === l));
    const languages = Object.fromEntries(idiomas.map((l) => [LANG[l], url(caminhoBlog(blog, l))]));
    for (const l of idiomas) {
      out.push({ url: url(caminhoBlog(blog, l)), changeFrequency: "weekly", priority: 0.6, alternates: { languages } });
    }
  }
  const grupos = new Map<string, Post[]>();
  for (const p of publicados) {
    const k = `${p.blog}:${p.traducao}`;
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  for (const grupo of grupos.values()) {
    const languages = Object.fromEntries(grupo.map((p) => [LANG[p.idioma], url(caminhoBlog(p.blog, p.idioma, p.slug))]));
    for (const p of grupo) {
      out.push({
        url: url(caminhoBlog(p.blog, p.idioma, p.slug)),
        lastModified: p.atualizado ?? p.data,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: { languages },
      });
    }
  }
  return out;
}
