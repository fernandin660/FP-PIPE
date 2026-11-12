import type { Metadata } from "next";
import "./globals.css";
import { interTight } from "../components/studio/fontes";

import ManipuladorCodigoAuth from "../components/ManipuladorCodigoAuth";
import GatilhoNovoUsuario from "../components/GatilhoNovoUsuario";
import GerenciadorSessao from "../components/GerenciadorSessao";

const TITULO = "FP Pipe | Listas de Prospecção B2B, Contatos e Primeira Abordagem";
const DESCRICAO =
  "Encontre empresas com o perfil do seu cliente ideal, veja quem decide a compra e receba uma primeira abordagem pronta. Prospecção B2B e CRM nas Américas e na Europa.";

/** Prévia dos links da plataforma (WhatsApp, LinkedIn, e-mail…) com a logo. */
const IMAGEM_COMPARTILHAR = { url: "/og-fppipe.png", width: 1200, height: 630, alt: "FP Pipe" };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.fppipe.com.br"),
  title: TITULO,
  description: DESCRICAO,
  applicationName: "FP Pipe",
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
