import type { Metadata } from "next";
import Envelope from "../../../../../components/studio/Envelope";
import { PaginaArtigo, metadadosArtigo } from "../../../../../components/blog/PaginasBlog";
import { listarPosts } from "../../../../../lib/blog";

export const dynamicParams = false;

export function generateStaticParams() {
  return listarPosts("prospeccao", "pt").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/plataforma/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return metadadosArtigo("prospeccao", "pt", slug);
}

export default async function Pagina({ params }: PageProps<"/plataforma/blog/[slug]">) {
  const { slug } = await params;
  return (
    <Envelope idioma="pt-BR">
      <PaginaArtigo blog="prospeccao" idioma="pt" slug={slug} />
    </Envelope>
  );
}
