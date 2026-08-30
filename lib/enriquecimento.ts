import { criarClienteSupabaseAdmin } from "./supabase/admin";

const CHAVE_MAPS = process.env.GOOGLE_MAPS_API_KEY ?? "";
const CHAVE_SERPER = process.env.SERPER_API_KEY ?? "";
const CHAVE_MILLIONPHONES = process.env.MILLIONPHONES_API_KEY ?? "";

// ============================================================
// 1. Google Search via Serper — busca telefone nos resultados
// ============================================================

type SerperOrganico = {
  title?: string;
  snippet?: string;
  link?: string;
};

type SerperResposta = {
  organic?: SerperOrganico[];
};

export async function buscarTelefoneSerper(
  nomePessoa: string,
  nomeEmpresa: string
): Promise<{ telefone?: string; email?: string }> {
  if (!CHAVE_SERPER || !nomePessoa) return {};

  const query = `"${nomePessoa}" "${nomeEmpresa}" telefone contato`;
  const queryFallback = `"${nomePessoa}" telefone`;

  for (const q of [query, queryFallback]) {
    try {
      const resposta = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": CHAVE_SERPER,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q, gl: "br", hl: "pt-br", num: 5 }),
        signal: AbortSignal.timeout(5000),
      });

      if (!resposta.ok) continue;

      const dados = (await resposta.json()) as SerperResposta;
      const textos = (dados.organic ?? [])
        .map((o) => `${o.title ?? ""} ${o.snippet ?? ""}`)
        .join(" ");

      // Regex telefone BR: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
      const telRegex = /\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/g;
      const telefones = textos.match(telRegex) ?? [];

      if (telefones.length > 0 && telefones[0]) {
        return { telefone: telefones[0].trim() };
      }
    } catch {
      // Continua pra próxima query
    }
  }

  return {};
}

export async function buscarTelefoneEmpresaSerper(
  nomeEmpresa: string
): Promise<{ telefones: string[] }> {
  if (!CHAVE_SERPER || !nomeEmpresa) return { telefones: [] };
  try {
    const resposta = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": CHAVE_SERPER, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `"${nomeEmpresa}" telefone contato`, gl: "br", hl: "pt-br", num: 8 }),
      signal: AbortSignal.timeout(6000),
    });
    if (!resposta.ok) return { telefones: [] };
    const dados = (await resposta.json()) as SerperResposta;
    const texto = (dados.organic ?? []).map((item) => `${item.title ?? ""} ${item.snippet ?? ""}`).join(" ");
    return { telefones: [...new Set(texto.match(/\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/g) ?? [])].slice(0, 10) };
  } catch {
    return { telefones: [] };
  }
}

// ============================================================
// 2. Google Maps Places API — telefone + website da empresa
// ============================================================

type RespostaPlaces = {
  places?: Array<{
    displayName?: { text?: string };
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
  }>;
};

export async function buscarTelefoneMaps(
  nomeEmpresa: string,
  cidade?: string,
  uf?: string
): Promise<{ telefone?: string; website?: string }> {
  if (!CHAVE_MAPS || !nomeEmpresa) return {};

  const termo = [nomeEmpresa, cidade, uf].filter(Boolean).join(" ");

  try {
    const resposta = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": CHAVE_MAPS,
          "X-Goog-FieldMask":
            "places.displayName,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri",
        },
        body: JSON.stringify({
          textQuery: termo,
          languageCode: "pt-BR",
          regionCode: "BR",
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as RespostaPlaces;
    const lugar = (dados.places ?? [])[0];

    return {
      telefone:
        lugar?.internationalPhoneNumber ??
        lugar?.nationalPhoneNumber ??
        undefined,
      website: lugar?.websiteUri ?? undefined,
    };
  } catch {
    return {};
  }
}

// ============================================================
// 3. Brasil API — telefone do responsável pelo CNPJ
// ============================================================

type RespostaBrasilApi = {
  nome?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  email?: string;
  qsa?: Array<{ nome_socio: string }>;
};

export async function buscarDadosCnpj(
  cnpj: string
): Promise<{
  telefone?: string;
  telefone2?: string;
  email?: string;
  razaoSocial?: string;
  socios?: string[];
}> {
    const cnpjLimpo = cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) return {};

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as RespostaBrasilApi;

    const tel1 = typeof dados.ddd_telefone_1 === "string" ? dados.ddd_telefone_1.trim() : "";
    const tel2 = typeof dados.ddd_telefone_2 === "string" ? dados.ddd_telefone_2.trim() : "";

    return {
      telefone: tel1 || undefined,
      telefone2: tel2 || undefined,
      email: dados.email ?? undefined,
      razaoSocial: dados.nome ?? undefined,
      socios: dados.qsa?.map((s) => s.nome_socio) ?? [],
    };
  } catch {
    return {};
  }
}

// ============================================================
// 4. Casa dos Dados — busca CNPJ pelo nome da empresa
// ============================================================

type CasaDosDadosItem = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  telefone_1?: string;
  telefone_2?: string;
  email?: string;
};

type CasaDosDadosResposta = {
  total?: number;
  cnpjs?: CasaDosDadosItem[];
};

export async function buscarCnpjPorEmpresa(
  nomeEmpresa: string
): Promise<{ cnpj?: string; telefone?: string; nome_fantasia?: string; razao_social?: string }> {
  if (!nomeEmpresa) return {};

  try {
    const resposta = await fetch(
      "https://api.casadosdados.com.br/v5/public/cnpj/pesquisa",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
        },
        body: JSON.stringify({
          nome_empresa: [nomeEmpresa.toLowerCase()],
          situacao_cadastral: ["ATIVA"],
          limite: 1,
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as CasaDosDadosResposta;
    const item = (dados.cnpjs ?? [])[0];

    return {
      cnpj: item?.cnpj ?? undefined,
      telefone: item?.telefone_1 ?? item?.telefone_2 ?? undefined,
      nome_fantasia: item?.nome_fantasia ?? undefined,
      razao_social: item?.razao_social ?? undefined,
    };
  } catch {
    return {};
  }
}

// ============================================================
// 6. Buscar cargo atual via Google (Serper)
// ============================================================

export async function buscarCargoAtual(
  nomePessoa: string,
  nomeEmpresa?: string
): Promise<{ cargo?: string }> {
  if (!CHAVE_SERPER || !nomePessoa) return {};

  const query = nomeEmpresa
    ? `"${nomePessoa}" "${nomeEmpresa}" site:linkedin.com/in`
    : `"${nomePessoa}" site:linkedin.com/in`;

  try {
    const resposta = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": CHAVE_SERPER,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: 3 }),
      signal: AbortSignal.timeout(6000),
    });

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as SerperResposta;

    for (const item of dados.organic ?? []) {
      const titulo = item.title ?? "";
      const snippet = item.snippet ?? "";

      // LinkedIn titles geralmente: "Nome - Cargo - Empresa | LinkedIn"
      const partesTitulo = titulo.split(" - ");
      if (partesTitulo.length >= 2) {
        const candidato = partesTitulo[1]?.trim();
        if (
          candidato &&
          candidato.length > 2 &&
          candidato.length < 80 &&
          !candidato.toLowerCase().includes("linkedin")
        ) {
          return { cargo: candidato };
        }
      }

      // Fallback: procurar no snippet padrão "Cargo at Company"
      const matchAtual = snippet.match(
        /(?:at|em|na)\s+([A-ZÀ-Ú][\wÀ-ú\s&]+?)(?:\s*·|\s*\||\s*$)/
      );
      if (matchAtual?.[1]) {
        return { cargo: matchAtual[1].trim() };
      }

      // Fallback: "Cargo em Company" em português
      const matchEm = snippet.match(
        /([\wÀ-ú\s]+?)\s+(?:em|na|at)\s+([A-ZÀ-Ú][\wÀ-ú\s&]+?)(?:\s*·|\s*\||\s*$)/
      );
      if (matchEm?.[1] && matchEm[1].trim().length > 2) {
        return { cargo: matchEm[1].trim() };
      }
    }

    return {};
  } catch {
    return {};
  }
}

// ============================================================
// 6b. Buscar site e LinkedIn da empresa via Google (Serper)
// ============================================================

export async function buscarDadosEmpresaGoogle(
  nomeEmpresa: string
): Promise<{ website?: string; linkedin_url?: string }> {
  if (!CHAVE_SERPER || !nomeEmpresa) return {};

  const results: { website?: string; linkedin_url?: string } = {};

  const queries = [
    `"${nomeEmpresa}" site oficial`,
    `"${nomeEmpresa}" site:linkedin.com/company`,
  ];

  for (const q of queries) {
    try {
      const resposta = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": CHAVE_SERPER,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q, gl: "br", hl: "pt-br", num: 5 }),
        signal: AbortSignal.timeout(5000),
      });

      if (!resposta.ok) continue;

      const dados = (await resposta.json()) as SerperResposta;

      for (const item of dados.organic ?? []) {
        const link = item.link ?? "";
        const titulo = (item.title ?? "").toLowerCase();

        if (!results.linkedin_url && link.includes("linkedin.com/company/")) {
          const match = link.match(/linkedin\.com\/company\/[\w-]+/);
          if (match) {
            results.linkedin_url = `https://www.${match[0]}`;
          }
        }

        if (!results.website && link && !link.includes("linkedin.com") && !link.includes("google.com") && !link.includes("facebook.com") && !link.includes("cnpj.biz") && !link.includes("casadosdados") && !link.includes("receitaws") && !link.includes("serpro")) {
          try {
            const url = new URL(link);
            const dominio = url.hostname.replace(/^www\./, "");
            if (!dominio.includes("wikipedia.org") && !dominio.includes("youtube.com") && !dominio.includes("instagram.com")) {
              results.website = url.origin;
            }
          } catch {}
        }
      }
    } catch {
      // Continua pra próxima query
    }

    if (results.website && results.linkedin_url) break;
  }

  return results;
}

// ============================================================
// 7. MillionPhones — telefone via LinkedIn URL
// ============================================================

type MillionPhonesResposta = {
  status?: string;
  data?: {
    phone_numbers?: string[];
    emails?: string[];
  };
};

export async function buscarTelefoneMillionPhones(
  linkedinUrl: string
): Promise<{ telefone?: string }> {
  if (!CHAVE_MILLIONPHONES || !linkedinUrl) return {};

  try {
    const resposta = await fetch(
      `https://api.millionphones.com/v1/phone?social_url=${encodeURIComponent(linkedinUrl)}`,
      {
        headers: {
          Authorization: `Bearer ${CHAVE_MILLIONPHONES}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as MillionPhonesResposta;
    const telefones = dados.data?.phone_numbers ?? [];

    if (telefones.length > 0 && telefones[0]) {
      return { telefone: telefones[0] };
    }

    return {};
  } catch {
    return {};
  }
}

// ============================================================
// 7. Geração de e-mails — sugestões via IA + padrões
// ============================================================

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function extrairPartesNome(nome: string): { primeiro: string; ultimo: string; inicial: string } {
  const partes = normalizarNome(nome).split(/\s+/).filter(Boolean);
  const primeiro = partes[0] ?? "";
  const ultimo = partes[partes.length - 1] ?? "";
  const inicial = primeiro[0] ?? "";
  return { primeiro, ultimo, inicial };
}

export function sugerirEmails(nome: string, dominio: string): string[] {
  if (!nome || !dominio) return [];

  const { primeiro, ultimo, inicial } = extrairPartesNome(nome);
  if (!primeiro || !ultimo) return [];

  const dominioLimpo = dominio.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

  const sugestoes = [
    `${primeiro}.${ultimo}@${dominioLimpo}`,
    `${primeiro}@${dominioLimpo}`,
    `${inicial}${ultimo}@${dominioLimpo}`,
    `${primeiro}${ultimo}@${dominioLimpo}`,
    `${ultimo}.${primeiro}@${dominioLimpo}`,
    `${primeiro}_${ultimo}@${dominioLimpo}`,
    `${inicial}.${ultimo}@${dominioLimpo}`,
  ];

  return [...new Set(sugestoes)];
}

export function sugerirEmailsEmpresa(dominio: string): string[] {
  if (!dominio) return [];

  const dominioLimpo = dominio.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

  const prefixos = [
    "contato",
    "vendas",
    "comercial",
    "admin",
    "recepcao",
    "atendimento",
  ];

  return prefixos.map((p) => `${p}@${dominioLimpo}`);
}

// Lê apenas a página inicial e páginas de contato sobre o mesmo domínio.
// Não executa JavaScript e limita o volume para manter a busca rápida e segura.
export async function buscarContatosNoSite(website: string): Promise<{
  emails: string[];
  telefones: string[];
}> {
  if (!website) return { emails: [], telefones: [] };

  try {
    const origem = new URL(website);
    const paginas = new Set([origem.toString()]);
    const resposta = await fetch(origem.toString(), {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "FP-Pipe/1.0" },
    });
    if (!resposta.ok) return { emails: [], telefones: [] };
    const html = (await resposta.text()).slice(0, 500_000);
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map((match) => match[1])
      .filter((link) => /contato|contact|fale|atendimento|sobre/i.test(link));

    for (const link of links.slice(0, 2)) {
      try {
        const url = new URL(link, origem);
        if (url.hostname === origem.hostname) paginas.add(url.toString());
      } catch {}
    }

    const textos = [html];
    for (const pagina of [...paginas].slice(1)) {
      try {
        const paginaResposta = await fetch(pagina, {
          signal: AbortSignal.timeout(4000),
          headers: { "User-Agent": "FP-Pipe/1.0" },
        });
        if (paginaResposta.ok) textos.push((await paginaResposta.text()).slice(0, 300_000));
      } catch {}
    }

    const texto = textos.join(" ");
    const emails = [...new Set((texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])
      .map((email) => email.toLowerCase())
      .filter((email) => !/example\.(com|org)|sentry|wixpress/i.test(email)))].slice(0, 10);
    const telefones = [...new Set(texto.match(/\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/g) ?? [])].slice(0, 10);
    return { emails, telefones };
  } catch {
    return { emails: [], telefones: [] };
  }
}

// ============================================================
// 8. Buscar domínio do site da empresa (Casa dos Dados)
// ============================================================

export async function buscarDominioEmpresa(
  nomeEmpresa: string
): Promise<{ dominio?: string; cnpj?: string }> {
  if (!nomeEmpresa) return {};

  try {
    const resposta = await fetch(
      "https://api.casadosdados.com.br/v5/public/cnpj/pesquisa",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_empresa: [nomeEmpresa.toLowerCase()],
          situacao_cadastral: ["ATIVA"],
          limite: 1,
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as CasaDosDadosResposta;
    const item = (dados.cnpjs ?? [])[0];

    // Casa dos Dados não retorna website diretamente, mas retorna CNPJ
    // que pode ser usado na Brasil API para achar o site
    return {
      cnpj: item?.cnpj ?? undefined,
    };
  } catch {
    return {};
  }
}

// ============================================================
// 9. Buscar website via Brasil API (com CNPJ)
// ============================================================

type BrasilApiSite = {
  cnpj: string;
  situacao_cadastral: string;
  nome_fantasia?: string;
  razao_social?: string;
  // Brasil API não retorna website diretamente,
  // mas retorna dados que ajudam a montar o domínio
};

export async function buscarWebsitePorCnpj(
  cnpj: string
): Promise<{ website?: string; dominio?: string }> {
  const cnpjLimpo = cnpj.replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) return {};

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as BrasilApiSite;

    // Se tem nome fantasia, tenta montar o domínio
    const fantasia = dados.nome_fantasia;
    if (fantasia) {
      const slug = normalizarNome(fantasia)
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "");
      return { dominio: `${slug}.com.br` };
    }

    return {};
  } catch {
    return {};
  }
}

// ============================================================
// 10. Cache de enriquecimento — não re-busca o que já temos
// ============================================================

export async function buscarCacheEnriquecimento(
  linkedinUrl: string
): Promise<{
  telefones: string[];
  website?: string;
} | null> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("enriquecimento_cache")
    .select("telefones, website")
    .eq("linkedin_url", linkedinUrl)
    .maybeSingle();

  return data ?? null;
}

export async function salvarCacheEnriquecimento(
  linkedinUrl: string,
  telefones: string[],
  website?: string
) {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return;

  await admin.from("enriquecimento_cache").upsert(
    {
      linkedin_url: linkedinUrl,
      telefones,
      website: website ?? null,
    },
    { onConflict: "linkedin_url" }
  );
}

// ============================================================
// 11. Helper: normalizar telefone BR (remover formatação)
// ============================================================

function normalizarTel(tel: string): string {
  return tel.replace(/\D/g, "");
}

function telJaExiste(telefones: string[], novo: string): boolean {
  const novoLimpo = normalizarTel(novo);
  return telefones.some((t) => normalizarTel(t) === novoLimpo);
}

function adicionarSeNovo(telefones: string[], novo: string, fontes: string[], fonte: string) {
  if (novo && !telJaExiste(telefones, novo)) {
    telefones.push(novo);
    fontes.push(fonte);
  }
}

// ============================================================
// 12. Orquestrador — cascade completa (telefone)
//
//  Fluxo:
//  1. Cache → se tem telefone, retorna (zero custo)
//  2. Serper → busca "nome empresa telefone" no Google
//  3. Maps → telefone + website da empresa
//  4. Casa dos Dados → acha CNPJ pelo nome
//  5. Brasil API → telefone do responsável legal
//  6. MillionPhones → telefone via LinkedIn (pago, 1 crédito)
//  7. Salva no cache
// ============================================================

export async function enriquecerTelefonesContato(
  linkedinUrl: string,
  nomeEmpresa: string,
  nomePessoa?: string,
  cidade?: string,
  uf?: string,
  cnpj?: string
): Promise<{
  telefones: string[];
  website?: string;
  fontes: string[];
}> {
  // 1. Cache
  const cache = await buscarCacheEnriquecimento(linkedinUrl);
  if (cache && cache.telefones.length > 0) {
    return {
      telefones: cache.telefones,
      website: cache.website ?? undefined,
      fontes: ["cache"],
    };
  }

  const telefones: string[] = [];
  const fontes: string[] = [];
  let website: string | undefined;

  // 2. Serper — busca pessoa + empresa no Google
  if (nomePessoa && nomeEmpresa) {
    const serper = await buscarTelefoneSerper(nomePessoa, nomeEmpresa);
    adicionarSeNovo(telefones, serper.telefone ?? "", fontes, "google_search");
  }

  // Também procura o telefone público da empresa diretamente no Google.
  const empresaGoogle = await buscarTelefoneEmpresaSerper(nomeEmpresa);
  for (const telefone of empresaGoogle.telefones) {
    adicionarSeNovo(telefones, telefone, fontes, "google_empresa");
  }

  // 3. Google Maps — telefone + website da empresa
  const maps = await buscarTelefoneMaps(nomeEmpresa, cidade, uf);
  if (maps.telefone) {
    adicionarSeNovo(telefones, maps.telefone, fontes, "maps");
  }
  if (maps.website && !website) {
    website = maps.website;
  }

  // 4+5. CNPJ → Brasil API
  let cnpjEncontrado = cnpj;

  if (!cnpjEncontrado && nomeEmpresa) {
    const casa = await buscarCnpjPorEmpresa(nomeEmpresa);
    if (casa.cnpj) {
      cnpjEncontrado = casa.cnpj;
      if (casa.telefone) {
        adicionarSeNovo(telefones, casa.telefone, fontes, "casa_dos_dados");
      }
    }
  }

  if (cnpjEncontrado) {
    const brasil = await buscarDadosCnpj(cnpjEncontrado);
    adicionarSeNovo(telefones, brasil.telefone ?? "", fontes, "brasil_api");
    adicionarSeNovo(telefones, brasil.telefone2 ?? "", fontes, "brasil_api");
  }

  // 6. MillionPhones — telefone via LinkedIn (pago)
  if (telefones.length === 0 && linkedinUrl) {
    const mp = await buscarTelefoneMillionPhones(linkedinUrl);
    if (mp.telefone) {
      adicionarSeNovo(telefones, mp.telefone, fontes, "millionphones");
    }
  }

  // 7. Salva no cache
  if (telefones.length > 0 || website) {
    void salvarCacheEnriquecimento(linkedinUrl, telefones, website);
  }

  return { telefones, website, fontes };
}

// ============================================================
// 13. Orquestrador — busca de contato completo
//
//  Retorna: emails sugeridos + telefone verificado
// ============================================================

export async function buscarContatoCompleto(
  linkedinUrl: string,
  nomeEmpresa: string,
  nomePessoa?: string,
  cidade?: string,
  uf?: string,
  cnpj?: string
): Promise<{
  emails: string[];
  telefones: string[];
  cargo?: string;
  website?: string;
  fontesEmail: string[];
  fontesTelefone: string[];
}> {
  // Buscar cargo atual via Google (paralelo com telefone)
  const [telefoneResult, cargoResult] = await Promise.all([
    enriquecerTelefonesContato(linkedinUrl, nomeEmpresa, nomePessoa, cidade, uf, cnpj),
    linkedinUrl && nomePessoa ? buscarCargoAtual(nomePessoa, nomeEmpresa) : Promise.resolve({ cargo: undefined as string | undefined }),
  ]);

  // Buscar domínio para gerar emails
  let dominio: string | undefined;
  let websiteParaContato = telefoneResult.website;
  let cnpjEncontrado = cnpj;

  if (!cnpjEncontrado && nomeEmpresa) {
    const dominioResult = await buscarDominioEmpresa(nomeEmpresa);
    cnpjEncontrado = dominioResult.cnpj;
  }

  if (cnpjEncontrado) {
    const websiteResult = await buscarWebsitePorCnpj(cnpjEncontrado);
    dominio = websiteResult.dominio;
  }

  // Se não achou domínio pelo CNPJ, tenta pelo website do Maps
  if (!dominio && telefoneResult.website) {
    dominio = telefoneResult.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
  }

  // Último recurso de domínio: o site oficial encontrado no Google.
  if (!dominio && nomeEmpresa) {
    const googleEmpresa = await buscarDadosEmpresaGoogle(nomeEmpresa);
    if (googleEmpresa.website) {
      websiteParaContato = googleEmpresa.website;
      dominio = googleEmpresa.website
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0];
    }
  }

  // Gerar sugestões de email
  let emails: string[] = [];
  let fontesEmail: string[] = [];

  if (nomePessoa && dominio) {
    emails = sugerirEmails(nomePessoa, dominio);
    fontesEmail = ["ia_padrao"];
  } else if (dominio) {
    emails = sugerirEmailsEmpresa(dominio);
    fontesEmail = ["emails_empresa"];
  }

  if (websiteParaContato) {
    const dadosSite = await buscarContatosNoSite(websiteParaContato);
    emails = [...new Set([...dadosSite.emails, ...emails])].slice(0, 15);
    fontesEmail = [...new Set([...dadosSite.emails.map(() => "site"), ...fontesEmail])];
  }

  return {
    emails,
    telefones: telefoneResult.telefones,
    cargo: cargoResult.cargo,
    website: telefoneResult.website,
    fontesEmail,
    fontesTelefone: telefoneResult.fontes,
  };
}
