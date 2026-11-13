import type { MetadataRoute } from "next";
import { ORIGEM_SITE } from "../lib/seo";

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
  ];
}
