import type { MetadataRoute } from "next";
import { ORIGEM_SITE } from "../lib/seo";

/*
 * robots.txt do site.
 *
 * - Buscadores (Google, Bing) e buscas com IA (ChatGPT search, Perplexity,
 *   Claude search…) podem ler todas as páginas públicas.
 * - Os robôs que coletam dados para TREINAR modelos de IA continuam bloqueados
 *   pela lista gerenciada do Cloudflare, que é somada a este arquivo.
 * - Não listamos telas internas aqui (isso entregaria o mapa do sistema a
 *   quem lê o arquivo); elas recebem "noindex" pelo cabeçalho X-Robots-Tag e
 *   exigem login de qualquer forma.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${ORIGEM_SITE}/sitemap.xml`,
    host: ORIGEM_SITE,
  };
}
