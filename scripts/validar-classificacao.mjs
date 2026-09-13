// ============================================================================
// Valida que todos os códigos CNAE declarados em lib/classificacao.ts são
// subclasses oficiais do IBGE (CNAE 2.3, 7 dígitos).
//
// Uso:
//   node scripts/validar-classificacao.mjs
//     -> baixa a base oficial do IBGE (servicodados.ibge.gov.br) e valida.
//
//   node scripts/validar-classificacao.mjs caminho\para\cnae_ibge.json
//     -> usa um JSON local já baixado (evita rede / contorno de firewall).
//        Formato esperado: { "subclasses": [ { "id": "4929902", ... } ] }
//
// Sai com exit code 0 se tudo validar; 1 em caso de erro.
// ============================================================================

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const caminhoTs = path.join(raiz, "lib", "classificacao.ts");
const URL_IBGE = "https://servicodados.ibge.gov.br/api/v2/cnae/subclasses";

async function carregarSubclasses(argLocal) {
  if (argLocal) {
    const dados = JSON.parse(await fs.readFile(argLocal, "utf8"));
    return dados.subclasses ?? dados;
  }
  const resposta = await fetch(URL_IBGE, { headers: { "User-Agent": "inteligencia-comercial" } });
  if (!resposta.ok) throw new Error(`IBGE respondeu HTTP ${resposta.status}`);
  return await resposta.json();
}

const ts = await fs.readFile(caminhoTs, "utf8");
const subclasses = await carregarSubclasses(process.argv[2]);

const validos = new Set(subclasses.map((s) => s.id));
const descricaoPorId = new Map(subclasses.map((s) => [s.id, s.descricao]));

const blocos = [];
const reBloco = /id:\s*"([^"]+)",\s*nome:\s*"([^"]+)",\s*descricao:\s*"([^"]*)",\s*cnaes:\s*\[([^\]]*)\]/gs;
let m;
while ((m = reBloco.exec(ts)) !== null) {
  const cnaes = [...m[4].matchAll(/"(?:(\d{7})|[a-z0-9]+)"/g)].map((x) => x[1]);
  blocos.push({ subsegmento: m[1], nome: m[2], cnaes });
}

const erros = [];
let total = 0;
for (const b of blocos) {
  for (const c of b.cnaes) {
    total++;
    if (!validos.has(c)) {
      erros.push(`[${b.subsegmento}] ${c} nao e subclasse oficial IBGE`);
    }
  }
}

// Duplicatas dentro do MESMO subsegmento (indicam erro de cadastro)
for (const b of blocos) {
  const vistos = new Set();
  for (const c of b.cnaes) {
    if (vistos.has(c)) erros.push(`[${b.subsegmento}] código repetido dentro do mesmo subsegmento: ${c}`);
    vistos.add(c);
  }
}

console.log(`Subclasses IBGE: ${validos.size}`);
console.log(`Subsegmentos: ${blocos.length}`);
console.log(`Códigos declarados: ${total}`);

if (erros.length) {
  console.log(`ERROS (${erros.length}):`);
  for (const e of erros) console.log("  -", e);
  process.exit(1);
}

console.log("OK: todos os códigos CNAE são subclasses oficiais IBGE (CNAE 2.3).");
process.exit(0);