import { notFound } from "next/navigation";
import { ehIdioma, IDIOMAS } from "../../components/studio/dicionario";
import Envelope from "../../components/studio/Envelope";

export const dynamicParams = false;

export function generateStaticParams() {
  return IDIOMAS.map((lang) => ({ lang }));
}

export default async function LayoutStudio({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  return <Envelope idioma={lang}>{children}</Envelope>;
}
