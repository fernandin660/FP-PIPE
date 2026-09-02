// ============================================================
// Cache de enriquecimento — usado ANTES de qualquer provider pago
// (reuso barato). A tabela `enriquecimento_cache` é GLOBAL e por
// service-role. Esta versão adiciona METADADOS de forma aditiva e
// não destrutiva (fonte/origem, confiança, tipo de telefone, data).
//
// Se as colunas novas ainda não existirem, cai para o modo legado
// (somente telefones/website) sem quebrar.
// ============================================================

import { criarClienteSupabaseAdmin } from "../supabase/admin";
import type { DadoTipo, TelefoneTipo } from "./types";

type CacheMeta = {
  tipo_dado: DadoTipo;
  fonte: string;
  provider_origem: string;
  confianca: number;
  tipo_telefone: TelefoneTipo | null;
  data_consulta: string;
  org_criadora: string | null;
};

export type CacheHit<T> = { dados: T; meta: CacheMeta } | null;

const CAMPOS_META = "tipo_dado, fonte, provider_origem, confianca, tipo_telefone, data_consulta, org_criadora";

export async function lerCache<T extends { telefones?: unknown; website?: unknown }>(
  chave: string,
  tipo: DadoTipo
): Promise<CacheHit<T>> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data } = await admin
      .from("enriquecimento_cache")
      .select(`telefones, website, ${CAMPOS_META}`)
      .eq("linkedin_url", chave)
      .maybeSingle();

    if (!data) return null;

    // Se as colunas não existirem, o select falha (entra no catch) — aqui
    // assume que existem. Se não existirem metadados, monta meta "legada".
    const meta: CacheMeta = {
      tipo_dado: (data.tipo_dado as DadoTipo) ?? tipo,
      fonte: (data.fonte as string) ?? "cache",
      provider_origem: (data.provider_origem as string) ?? "cache",
      confianca: (data.confianca as number) ?? 30,
      tipo_telefone: (data.tipo_telefone as TelefoneTipo) ?? null,
      data_consulta: (data.data_consulta as string) ?? "",
      org_criadora: (data.org_criadora as string) ?? null,
    };
    return { dados: { telefones: data.telefones, website: data.website } as T, meta };
  } catch {
    // Colunas de metadados ainda não existem: usa somente telefones/website.
    const { data } = await admin
      .from("enriquecimento_cache")
      .select("telefones, website")
      .eq("linkedin_url", chave)
      .maybeSingle();
    if (!data) return null;
    return {
      dados: { telefones: data.telefones, website: data.website } as T,
      meta: {
        tipo_dado: tipo,
        fonte: "cache",
        provider_origem: "cache",
        confianca: 30,
        tipo_telefone: null,
        data_consulta: "",
        org_criadora: null,
      },
    };
  }
}

export async function gravarCache<T extends { telefones?: unknown; website?: unknown }>(
  chave: string,
  dados: T,
  meta: Partial<CacheMeta>
): Promise<void> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return;

  const base: Record<string, unknown> = {
    linkedin_url: chave,
    telefones: dados.telefones ?? [],
    website: dados.website ?? null,
  };

  try {
    await admin.from("enriquecimento_cache").upsert(
      {
        ...base,
        tipo_dado: meta.tipo_dado ?? "telefone",
        fonte: meta.fonte ?? "cache",
        provider_origem: meta.provider_origem ?? "cache",
        confianca: meta.confianca ?? 30,
        tipo_telefone: meta.tipo_telefone ?? null,
        data_consulta: meta.data_consulta ?? new Date().toISOString(),
        org_criadora: meta.org_criadora ?? null,
      },
      { onConflict: "linkedin_url" }
    );
  } catch {
    // Colunas novas não existem: grava só o modo legado (idempotente).
    try {
      await admin
        .from("enriquecimento_cache")
        .upsert(base, { onConflict: "linkedin_url" });
    } catch {
      // silencioso: cache nunca derruba o fluxo.
    }
  }
}
