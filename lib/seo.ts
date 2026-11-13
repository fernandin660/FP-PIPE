import type { Metadata } from "next";

/*
 * Base de SEO compartilhada pelos dois layouts raiz:
 *   app/(pt)/layout.tsx   → site em português, plataforma e telas internas
 *   app/[lang]/layout.tsx → site do estúdio e plataforma em fr/en/es
 */

export const ORIGEM_SITE = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.fppipe.com.br").replace(/\/$/, "");

/** Atributo <html lang> de cada idioma do site. */
export const LANG_HTML = { pt: "pt-BR", fr: "fr", en: "en", es: "es" } as const;

/** Imagem de prévia dos links (WhatsApp, LinkedIn, e-mail…) com a logo. */
export const IMAGEM_COMPARTILHAR = { url: "/og-fppipe.png", width: 1200, height: 630, alt: "FP Pipe" };

/**
 * Códigos de verificação do Google Search Console e do Bing Webmaster.
 * São públicos por natureza (ficam no HTML), mas vêm de variável de ambiente
 * para não exigir deploy de código ao trocar. Preferível: verificação por DNS.
 */
function verificacao(): Metadata["verification"] | undefined {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

export function metadadosBase(): Metadata {
  return {
    metadataBase: new URL(ORIGEM_SITE),
    applicationName: "FP Pipe",
    verification: verificacao(),
    formatDetection: { telephone: false },
  };
}

/** Telas que não devem aparecer no Google (login, sistema, recuperação de senha). */
export const SEM_INDEXAR: Metadata["robots"] = { index: false, follow: false, nocache: true };
