import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import LandingPlataforma from "../../../components/plataforma/LandingPlataforma";
import { metadadosPlataforma } from "../../../components/plataforma/metadados";
import { ehIdioma } from "../../../components/studio/dicionario";
import DadosEstruturados, { dadosPlataforma } from "../../../components/seo/DadosEstruturados";

export async function generateMetadata({ params }: PageProps<"/[lang]/plataforma">): Promise<Metadata> {
  const { lang } = await params;
  if (!ehIdioma(lang)) return {};
  return metadadosPlataforma(lang);
}

export default async function PaginaPlataformaIdioma({ params }: PageProps<"/[lang]/plataforma">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  // O português mora em /plataforma.
  if (lang === "pt") permanentRedirect("/plataforma");
  return (
    <>
      <DadosEstruturados dados={dadosPlataforma(lang)} />
      <LandingPlataforma idioma={lang} />
    </>
  );
}
