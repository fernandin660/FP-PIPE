import { Cormorant_Garamond, Inter_Tight } from "next/font/google";
import { notFound } from "next/navigation";
import { ehIdioma, IDIOMAS } from "../../components/studio/dicionario";
import AjustarIdiomaDocumento from "../../components/studio/AjustarIdiomaDocumento";
import "./studio.css";

const interTight = Inter_Tight({
  variable: "--font-studio",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

// Serifada usada só nas maquetes dos projetos (marcas fictícias/protótipo).
const cormorant = Cormorant_Garamond({
  variable: "--font-concept-serif",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const dynamicParams = false;

export function generateStaticParams() {
  return IDIOMAS.map((lang) => ({ lang }));
}

export default async function LayoutStudio({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();

  return (
    <div lang={lang} className={`studio-raiz ${interTight.variable} ${cormorant.variable}`}>
      <AjustarIdiomaDocumento idioma={lang} />
      {children}
    </div>
  );
}
