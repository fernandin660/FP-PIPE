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

// Áreas que só existem para quem está logado.
const ROTAS_INTERNAS = [
  "admin", "auth", "buscador", "creditos", "crm", "disparos", "equipe", "hoje",
  "listas", "login", "metricas", "modelos", "produtos", "prospeccao", "revisao-blog",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // O app tem dois layouts raiz ((pt) e [lang]); o 404 global cobre os dois.
    globalNotFound: true,
  },
  images: {
    // Fotos dos projetos do site do estúdio, servidas via /_next/image
    // (o visitante não se conecta direto a esses domínios — melhor p/ RGPD).
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "saint-martin-estate-stories.lovable.app" },
    ],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: cabecalhosSeguranca },
      // Respostas da API nunca devem ir para o índice de buscadores.
      { source: "/api/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Revisão do blog: o link tem um código secreto; não repassar a outros sites.
      { source: "/revisao-blog", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }] },
      // Telas do sistema (precisam de login): fora do Google. Usamos o
      // cabeçalho em vez de listar no robots.txt para não expor o mapa do app.
      ...ROTAS_INTERNAS.map((rota) => ({
        source: `/${rota}/:caminho*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      })),
      ...ROTAS_INTERNAS.map((rota) => ({
        source: `/${rota}`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      })),
    ];
  },
};

export default nextConfig;
