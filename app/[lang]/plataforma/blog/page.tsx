import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { IndiceBlog, metadadosIndice } from "../../../../components/blog/PaginasBlog";
import { ehIdioma } from "../../../../components/studio/dicionario";
import { caminhoBlog } from "../../../../lib/blog";

export async function generateMetadata({ params }: PageProps<"/[lang]/plataforma/blog">): Promise<Metadata> {
  const { lang } = await params;
  if (!ehIdioma(lang)) return {};
  return metadadosIndice("prospeccao", lang);
}

export default async function Pagina({ params }: PageProps<"/[lang]/plataforma/blog">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  if (lang === "pt") permanentRedirect(caminhoBlog("prospeccao", "pt"));
  return <IndiceBlog blog="prospeccao" idioma={lang} />;
}
