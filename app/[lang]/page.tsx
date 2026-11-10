import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteStudio from "../../components/studio/SiteStudio";
import { DICIONARIOS, ehIdioma } from "../../components/studio/dicionario";

const ORIGEM = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.fppipe.com.br";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!ehIdioma(lang)) return {};
  const dic = DICIONARIOS[lang];
  return {
    title: dic.meta.titulo,
    description: dic.meta.descricao,
    metadataBase: new URL(ORIGEM),
    alternates: {
      canonical: `/${lang}`,
      languages: { fr: "/fr", en: "/en", es: "/es", "x-default": "/fr" },
    },
    openGraph: {
      title: dic.meta.titulo,
      description: dic.meta.descricao,
      url: `/${lang}`,
      siteName: "FP Pipe Studio",
      locale: { fr: "fr_FR", en: "en_GB", es: "es_ES" }[lang],
      images: [{ url: "/studio/fernando-larissa.jpg", width: 1100, height: 1650 }],
      type: "website",
    },
  };
}

export default async function PaginaStudio({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  return <SiteStudio dic={DICIONARIOS[lang]} idioma={lang} />;
}
