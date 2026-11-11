import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados a todas as respostas.
const cabecalhosSeguranca = [
  // Impede que o app seja embutido em iframe de outro site (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  // Navegador não "adivinha" tipo de arquivo (evita executar upload como script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não vaza URLs internas (com ids) para sites externos.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Força HTTPS por 2 anos.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Fotos dos projetos do site do estúdio, servidas via /_next/image
    // (o visitante não se conecta direto a esses domínios — melhor p/ RGPD).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "saint-martin-estate-stories.lovable.app" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: cabecalhosSeguranca }];
  },
};

export default nextConfig;
