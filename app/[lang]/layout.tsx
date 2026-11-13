import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { ehIdioma, IDIOMAS } from "../../components/studio/dicionario";
import Envelope from "../../components/studio/Envelope";
import { interTight } from "../../components/studio/fontes";
import { IMAGEM_COMPARTILHAR, LANG_HTML, metadadosBase } from "../../lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return IDIOMAS.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  ...metadadosBase(),
  openGraph: { siteName: "FP Pipe", type: "website", images: [IMAGEM_COMPARTILHAR] },
};

/**
 * Layout raiz das páginas em francês, inglês e espanhol (site do estúdio e
 * plataforma). Ser raiz permite que o <html lang> já venha certo do servidor,
 * que é o que o Google lê para saber o idioma da página.
 */
export default async function LayoutIdioma({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  return (
    <html lang={LANG_HTML[lang]} className={`${interTight.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Envelope idioma={lang}>{children}</Envelope>
      </body>
    </html>
  );
}
