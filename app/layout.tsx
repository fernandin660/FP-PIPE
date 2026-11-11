import type { Metadata } from "next";
import "./globals.css";
import { interTight } from "../components/studio/fontes";

import ManipuladorCodigoAuth from "../components/ManipuladorCodigoAuth";
import GatilhoNovoUsuario from "../components/GatilhoNovoUsuario";
import GerenciadorSessao from "../components/GerenciadorSessao";

export const metadata: Metadata = {
  title: "FP Pipe | Listas de Prospecção B2B, Contatos e Primeira Abordagem",
  description:
    "Encontre empresas com o perfil do seu cliente ideal, veja quem decide a compra e receba uma primeira abordagem pronta. Prospecção B2B e CRM nas Américas e na Europa.",
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
