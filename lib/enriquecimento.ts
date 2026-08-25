import { criarClienteSupabaseAdmin } from "./supabase/admin";

const CHAVE_MAPS = process.env.GOOGLE_MAPS_API_KEY ?? "";
const CHAVE_SERPER = process.env.SERPER_API_KEY ?? "";

// ============================================================
// 1. Google Maps Places API — telefone + website da empresa
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
        signal: AbortSignal.timeout(8000),
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
// 2. Brasil API — telefone do responsável pelo CNPJ
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
      { signal: AbortSignal.timeout(8000) }
    );

    if (!resposta.ok) return {};

    const dados = (await resposta.json()) as RespostaBrasilApi;

    return {
      telefone: dados.ddd_telefone_1 ?? undefined,
      telefone2: dados.ddd_telefone_2 ?? undefined,
      email: dados.email ?? undefined,
      razaoSocial: dados.nome ?? undefined,
      socios: dados.qsa?.map((s) => s.nome_socio) ?? [],
    };
  } catch {
    return {};
  }
}

// ============================================================
// 3. Cache de enriquecimento — não re-busca o que já temos
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
// 4. Orquestrador — tenta todas as fontes e retorna o melhor
// ============================================================

export async function enriquecerTelefonesContato(
  linkedinUrl: string,
  nomeEmpresa: string,
  cidade?: string,
  uf?: string,
  cnpj?: string
): Promise<{
  telefones: string[];
  website?: string;
  fontes: string[];
}> {
  // 1. Checa cache primeiro
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

  // 2. Google Maps (telefone + website)
  const maps = await buscarTelefoneMaps(nomeEmpresa, cidade, uf);
  if (maps.telefone) {
    telefones.push(maps.telefone);
    fontes.push("maps");
  }
  if (maps.website) {
    website = maps.website;
  }

  // 3. Brasil API (se tiver CNPJ)
  if (cnpj) {
    const brasil = await buscarDadosCnpj(cnpj);
    if (brasil.telefone && !telefones.some((t) => t === brasil.telefone)) {
      telefones.push(brasil.telefone);
      fontes.push("brasil_api");
    }
    if (brasil.telefone2 && !telefones.some((t) => t === brasil.telefone2)) {
      telefones.push(brasil.telefone2);
      fontes.push("brasil_api");
    }
  }

  // 4. Salva no cache
  if (telefones.length > 0 || website) {
    void salvarCacheEnriquecimento(linkedinUrl, telefones, website);
  }

  return { telefones, website, fontes };
}
