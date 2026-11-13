// Roda antes do `next build`: busca no banco os posts do blog aprovados por
// e-mail e grava conteudo/blog/.aprovados.json (lido por lib/blog.ts).
//
// - Sem as variáveis do Supabase (ex.: build local) → lista vazia.
// - Com as variáveis e o banco fora do ar → o build FALHA de propósito:
//   a versão anterior do site continua no ar, em vez de subir uma versão
//   em que posts já aprovados sumiriam.
import fs from "node:fs";
import path from "node:path";

const destino = path.join(process.cwd(), "conteudo", "blog", ".aprovados.json");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chave) {
  fs.writeFileSync(destino, "[]\n");
  console.log("blog-aprovados: sem Supabase configurado, lista vazia.");
  process.exit(0);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

try {
  const r = await fetch(
    `${url}/rest/v1/blog_aprovacoes?status=eq.publicado&select=blog,idioma,slug`,
    { headers: { apikey: chave, Authorization: `Bearer ${chave}` }, signal: AbortSignal.timeout(15000) },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const linhas = await r.json();
  const lista = linhas
    .filter((l) => ["sites", "prospeccao"].includes(l.blog) && ["pt", "fr", "en", "es"].includes(l.idioma) && SLUG.test(l.slug))
    .map((l) => `${l.blog}/${l.idioma}/${l.slug}`)
    .sort();
  fs.writeFileSync(destino, JSON.stringify(lista, null, 2) + "\n");
  console.log(`blog-aprovados: ${lista.length} post(s) aprovado(s).`);
} catch (erro) {
  console.error("blog-aprovados: não consegui ler as aprovações do banco:", erro.message);
  process.exit(1);
}
