import type { Metadata } from "next";
import "../globals.css";
import { interTight } from "../../components/studio/fontes";
import { IMAGEM_COMPARTILHAR, metadadosBase } from "../../lib/seo";

import ManipuladorCodigoAuth from "../../components/ManipuladorCodigoAuth";
import GatilhoNovoUsuario from "../../components/GatilhoNovoUsuario";
import GerenciadorSessao from "../../components/GerenciadorSessao";

const TITULO = "FP Pipe | Listas de Prospecção B2B, Contatos e Primeira Abordagem";
const DESCRICAO =
  "Encontre empresas com o perfil do seu cliente ideal, veja quem decide a compra e receba uma primeira abordagem pronta. Prospecção B2B e CRM nas Américas e na Europa.";

export const metadata: Metadata = {
  ...metadadosBase(),
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    siteName: "FP Pipe",
    locale: "pt_BR",
    type: "website",
    images: [IMAGEM_COMPARTILHAR],
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO, images: [IMAGEM_COMPARTILHAR.url] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ManipuladorCodigoAuth />
        <GatilhoNovoUsuario />
        <GerenciadorSessao />
        {children}
      </body>
    </html>
  );
}
