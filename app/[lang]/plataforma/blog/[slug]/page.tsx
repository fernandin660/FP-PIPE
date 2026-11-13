import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PaginaArtigo, metadadosArtigo } from "../../../../../components/blog/PaginasBlog";
import { ehIdioma } from "../../../../../components/studio/dicionario";
import { caminhoBlog, listarPosts } from "../../../../../lib/blog";

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { lang: string } }) {
  if (!ehIdioma(params.lang) || params.lang === "pt") return [];
  return listarPosts("prospeccao", params.lang).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/plataforma/blog/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!ehIdioma(lang)) return {};
  return metadadosArtigo("prospeccao", lang, slug);
}

export default async function Pagina({ params }: PageProps<"/[lang]/plataforma/blog/[slug]">) {
  const { lang, slug } = await params;
  if (!ehIdioma(lang)) notFound();
  if (lang === "pt") permanentRedirect(caminhoBlog("prospeccao", "pt", slug));
  return <PaginaArtigo blog="prospeccao" idioma={lang} slug={slug} />;
}
