import type { Metadata } from "next";
import { Bebas_Neue, Sora } from "next/font/google";
import "./globals.css";

import ManipuladorCodigoAuth from "../components/ManipuladorCodigoAuth";
import GatilhoNovoUsuario from "../components/GatilhoNovoUsuario";

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
  title: "FP Pipe | Inteligência Comercial e Listas de Prospecção",
  description:
    "Defina seu cliente ideal com IA e gere listas de prospecção B2B enriquecidas, com decisores, dores e materiais prontos para o SDR.",
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
        {children}
      </body>
    </html>
  );
}
