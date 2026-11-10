import { Inter_Tight } from "next/font/google";
import { notFound } from "next/navigation";
import { ehIdioma, IDIOMAS } from "../../components/studio/dicionario";
import AjustarIdiomaDocumento from "../../components/studio/AjustarIdiomaDocumento";
import "./studio.css";

const interTight = Inter_Tight({
  variable: "--font-studio",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const dynamicParams = false;

export function generateStaticParams() {
  return IDIOMAS.map((lang) => ({ lang }));
}

export default async function LayoutStudio({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();

  return (
    <div lang={lang} className={`studio-raiz ${interTight.variable}`}>
      <AjustarIdiomaDocumento idioma={lang} />
      {children}
    </div>
  );
}
