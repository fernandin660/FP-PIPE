// Confere os arquivos do blog sem precisar do build inteiro:
//   npm run blog:validar
// Mesmas regras de lib/blog.ts + regras da rotina automática (status
// "aguardando", tamanho, fontes, HTML proibido).
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join(process.cwd(), "conteudo", "blog");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = new Set(["publicado", "rascunho", "aguardando"]);
const AUTORES = new Set(["fernando", "larissa", "equipe"]);
const erros = [];
const traducoes = new Map();
let total = 0;

for (const blog of ["sites", "prospeccao"]) {
  for (const idioma of ["pt", "fr", "en", "es"]) {
    const pasta = path.join(RAIZ, blog, idioma);
    if (!fs.existsSync(pasta)) continue;
    for (const arquivo of fs.readdirSync(pasta)) {
      if (!arquivo.endsWith(".md")) continue;
      total++;
      const nome = `${blog}/${idioma}/${arquivo}`;
      const slug = arquivo.slice(0, -3);
      if (!SLUG.test(slug)) erros.push(`${nome}: nome do arquivo deve ser minúsculo-com-hifens`);
      const bruto = fs.readFileSync(path.join(pasta, arquivo), "utf8");
      const m = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!m) { erros.push(`${nome}: falta o cabeçalho entre linhas ---`); continue; }
      const c = {};
      for (const linha of m[1].split(/\r?\n/)) {
        const i = linha.indexOf(":");
        if (i > 0) c[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
      }
      for (const campo of ["titulo", "descricao", "data", "traducao", "status", "autor"]) {
        if (!c[campo]) erros.push(`${nome}: falta "${campo}"`);
      }
      if (c.data && !DATA.test(c.data)) erros.push(`${nome}: data deve ser AAAA-MM-DD`);
      if (c.status && !STATUS.has(c.status)) erros.push(`${nome}: status inválido "${c.status}"`);
      if (c.autor && !AUTORES.has(c.autor)) erros.push(`${nome}: autor inválido "${c.autor}"`);
      if (c.titulo && c.titulo.length > 110) erros.push(`${nome}: título longo demais (${c.titulo.length})`);
      if (c.descricao && (c.descricao.length < 80 || c.descricao.length > 260)) erros.push(`${nome}: descrição deve ter 80–260 caracteres (${c.descricao.length})`);
      if (c.traducao) {
        const k = `${blog}:${c.traducao}:${idioma}`;
        if (traducoes.has(k)) erros.push(`${nome}: "traducao" repetida no mesmo idioma (${traducoes.get(k)})`);
        traducoes.set(k, nome);
      }
      const corpo = m[2];
      if (/<\s*(script|iframe|style|object|embed|form)\b/i.test(corpo)) erros.push(`${nome}: HTML proibido no texto`);
      if (/^#\s/m.test(corpo)) erros.push(`${nome}: não use "# " (o título já é o h1); comece em "## "`);
      if (c.status === "aguardando") {
        const palavras = corpo.split(/\s+/).filter(Boolean).length;
        if (palavras < 450 || palavras > 1600) erros.push(`${nome}: texto com ${palavras} palavras (esperado 450–1600)`);
        if (!/https:\/\/\S+/.test(corpo)) erros.push(`${nome}: post automático precisa citar a fonte com link https`);
      }
    }
  }
}

if (erros.length) {
  console.error(`Blog: ${erros.length} problema(s):\n- ` + erros.join("\n- "));
  process.exit(1);
}
console.log(`Blog: ${total} arquivo(s) OK.`);
