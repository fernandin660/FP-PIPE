"use client";

import { useEffect } from "react";

/**
 * O layout raiz do app é pt-BR (SaaS). Nas páginas do estúdio ajusta o
 * <html lang> para o idioma da página (leitores de tela, tradutores) e
 * o fundo do <body>, que no SaaS é escuro.
 */
export default function AjustarIdiomaDocumento({ idioma }: { idioma: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const anterior = html.lang;
    const fundoAnterior = document.body.style.background;
    html.lang = idioma;
    document.body.style.background = "#f4f3ef";
    return () => {
      html.lang = anterior;
      document.body.style.background = fundoAnterior;
    };
  }, [idioma]);
  return null;
}
