import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { IndiceBlog, metadadosIndice } from "../../../components/blog/PaginasBlog";
import { ehIdioma } from "../../../components/studio/dicionario";
import { caminhoBlog } from "../../../lib/blog";

export async function generateMetadata({ params }: PageProps<"/[lang]/blog">): Promise<Metadata> {
  const { lang } = await params;
  if (!ehIdioma(lang)) return {};
  return metadadosIndice("sites", lang);
}

export default async function Pagina({ params }: PageProps<"/[lang]/blog">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  if (lang === "pt") permanentRedirect(caminhoBlog("sites", "pt"));
  return <IndiceBlog blog="sites" idioma={lang} />;
}
