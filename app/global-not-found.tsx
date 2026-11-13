import type { Metadata } from "next";
import "./globals.css";
import { interTight } from "../components/studio/fontes";

export const metadata: Metadata = {
  title: "Página não encontrada — FP Pipe",
  robots: { index: false, follow: true },
};

/** 404 de qualquer endereço que não existe (o app tem dois layouts raiz). */
export default function NaoEncontrado() {
  return (
    <html lang="pt-BR" className={`${interTight.variable} h-full antialiased`}>
      <body className="flex min-h-full items-center justify-center bg-[#f4f3ef] px-6 text-[#111114]">
        <main className="max-w-md text-center">
          <svg width="28" height="28" viewBox="0 0 18 18" aria-hidden="true" className="mx-auto">
            <path d="M9 1.5 16.5 15H1.5Z" fill="#2442e5" />
          </svg>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.14em] text-[#2442e5]">Erro 404</p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.03em]">Página não encontrada</h1>
          <p className="mt-4 text-[#4b4b53]">O endereço pode ter mudado ou não existe mais.</p>
          {/* <a> de propósito: esta página fica fora dos layouts, recarregar é o certo. */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-medium">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="rounded-full bg-[#111114] px-5 py-2.5 text-white">
              Ir para o início
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/plataforma" className="rounded-full border border-[#d6d4cd] px-5 py-2.5">
              Conhecer a plataforma
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
