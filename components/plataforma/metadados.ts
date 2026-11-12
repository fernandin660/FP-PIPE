import type { Metadata } from "next";
import { caminhoPlataforma, type Idioma } from "../studio/dicionario";
import { TEXTOS_PLATAFORMA } from "./textos";

const ORIGEM = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.fppipe.com.br";

export function metadadosPlataforma(lang: Idioma): Metadata {
  const t = TEXTOS_PLATAFORMA[lang];
  return {
    title: t.meta.titulo,
    description: t.meta.descricao,
    metadataBase: new URL(ORIGEM),
    alternates: {
      canonical: caminhoPlataforma(lang),
      languages: {
        "pt-BR": "/plataforma",
        fr: "/fr/plataforma",
        en: "/en/plataforma",
        es: "/es/plataforma",
        "x-default": "/plataforma",
      },
    },
    openGraph: {
      title: t.meta.titulo,
      description: t.meta.descricao,
      url: caminhoPlataforma(lang),
      siteName: "FP Pipe",
      locale: t.local.replace("-", "_"),
      type: "website",
      images: [{ url: "/og-fppipe.png", width: 1200, height: 630, alt: "FP Pipe" }],
    },
    twitter: { card: "summary_large_image", title: t.meta.titulo, description: t.meta.descricao, images: ["/og-fppipe.png"] },
  };
}
