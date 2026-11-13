import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import SiteStudio from "../../components/studio/SiteStudio";
import { DICIONARIOS, ehIdioma } from "../../components/studio/dicionario";
import { metadadosStudio } from "../../components/studio/metadados";
import DadosEstruturados, { dadosEstudio } from "../../components/seo/DadosEstruturados";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!ehIdioma(lang)) return {};
  return metadadosStudio(lang);
}

export default async function PaginaStudio({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  // O português mora na página inicial do domínio.
  if (lang === "pt") permanentRedirect("/");
  return (
    <>
      <DadosEstruturados dados={dadosEstudio(lang)} />
      <SiteStudio dic={DICIONARIOS[lang]} idioma={lang} />
    </>
  );
}
