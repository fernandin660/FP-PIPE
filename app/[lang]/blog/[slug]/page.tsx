import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PaginaArtigo, metadadosArtigo } from "../../../../components/blog/PaginasBlog";
import { ehIdioma } from "../../../../components/studio/dicionario";
import { caminhoBlog, listarPosts } from "../../../../lib/blog";

export const dynamicParams = false;

export function generateStaticParams() {
  return (["fr", "en", "es"] as const).flatMap((lang) =>
    listarPosts("sites", lang).map((p) => ({ lang, slug: p.slug })),
  );
}

export async function generateMetadata({ params }: PageProps<"/[lang]/blog/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!ehIdioma(lang)) return {};
  return metadadosArtigo("sites", lang, slug);
}

export default async function Pagina({ params }: PageProps<"/[lang]/blog/[slug]">) {
  const { lang, slug } = await params;
  if (!ehIdioma(lang)) notFound();
  if (lang === "pt") permanentRedirect(caminhoBlog("sites", "pt", slug));
  return <PaginaArtigo blog="sites" idioma={lang} slug={slug} />;
}
