import type { Metadata } from "next";
import { Bebas_Neue, Sora } from "next/font/google";
import "./globals.css";

import ManipuladorCodigoAuth from "../components/ManipuladorCodigoAuth";
import GatilhoNovoUsuario from "../components/GatilhoNovoUsuario";
import GerenciadorSessao from "../components/GerenciadorSessao";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FP Pipe | Listas de Prospecção B2B, Contatos e Primeira Abordagem",
  description:
    "Encontre empresas com o perfil do seu cliente ideal, veja quem decide a compra e receba uma primeira abordagem pronta. Prospecção B2B no Brasil e nas Américas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${bebasNeue.variable} h-full antialiased`}
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
