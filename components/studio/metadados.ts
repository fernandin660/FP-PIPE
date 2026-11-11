import type { Metadata } from "next";
import { DICIONARIOS, caminhoIdioma, type Idioma } from "./dicionario";

const ORIGEM = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.fppipe.com.br";

export function metadadosStudio(lang: Idioma): Metadata {
  const dic = DICIONARIOS[lang];
  return {
    title: dic.meta.titulo,
    description: dic.meta.descricao,
    metadataBase: new URL(ORIGEM),
    alternates: {
      canonical: caminhoIdioma(lang),
      languages: { "pt-BR": "/", fr: "/fr", en: "/en", es: "/es", "x-default": "/" },
    },
    openGraph: {
      title: dic.meta.titulo,
      description: dic.meta.descricao,
      url: caminhoIdioma(lang),
      siteName: "FP Pipe",
      locale: { pt: "pt_BR", fr: "fr_FR", en: "en_GB", es: "es_ES" }[lang],
      images: [{ url: "/studio/fernando-larissa.jpg", width: 1100, height: 1650 }],
      type: "website",
    },
  };
}
