// ============================================================
// Cost Calculator — traduz (provider, tipo_dado) em moeda + créditos
// + custo estimado, a partir da tabela `enriquecimento_custos`.
// Se não houver registro (ou a tabela ainda não existir), usa defaults
// em código que PRESERVAM a cobrança atual da FP Pipe:
//   • millionphones + telefone → 1 crédito de `creditos_telefone`
//   • demais providers → custo 0 (gratuitos hoje)
// Mudar custo de um provider NÃO exige alterar código.
// ============================================================

import { criarClienteSupabaseAdmin } from "../supabase/admin";
import type { DadoTipo } from "./types";

export type Custo = {
  moeda: "credito" | "brl" | "usd";
  creditos: number;
  custo_estimado: number;
  tabela_creditos: "creditos" | "creditos_contatos" | "creditos_telefone" | "creditos_ia";
};

// Defaults (cobrança atual). Sobrescritos pela tabela enriquecimento_custos.
const DEFAULTS: Record<string, Custo> = {
  "millionphones:telefone": {
    moeda: "credito",
    creditos: 1,
    custo_estimado: 0,
    tabela_creditos: "creditos_telefone",
  },
};

export function custoPadrao(provider: string, tipo: DadoTipo): Custo {
  return DEFAULTS[`${provider}:${tipo}`] ?? {
    moeda: "credito",
    creditos: 0,
    custo_estimado: 0,
    tabela_creditos: "creditos",
  };
}

type LinhaCusto = {
  provider: string;
  tipo_dado: string;
  moeda: "credito" | "brl" | "usd";
  creditos: number;
  custo_estimado: number;
  tabela_creditos?: "creditos" | "creditos_contatos" | "creditos_telefone" | "creditos_ia";
};

// Resolve o custo efetivo: primeiro linha com organizacao_id da org, depois
// a global (organizacao_id NULL); sem registro, usa o default.
export async function custoPara(
  provider: string,
  tipo: DadoTipo,
  orgId?: string | null
): Promise<Custo> {
  const base = custoPadrao(provider, tipo);

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return base;

  try {
    let { data } = await admin
      .from("enriquecimento_custos")
      .select("provider, tipo_dado, moeda, creditos, custo_estimado, tabela_creditos")
      .eq("provider", provider)
      .eq("tipo_dado", tipo)
      .eq("ativo", true)
      .eq("organizacao_id", orgId ?? "__none__")
      .maybeSingle();

    if (!data) {
      const { data: global } = await admin
        .from("enriquecimento_custos")
        .select("provider, tipo_dado, moeda, creditos, custo_estimado, tabela_creditos")
        .eq("provider", provider)
        .eq("tipo_dado", tipo)
        .eq("ativo", true)
        .is("organizacao_id", null)
        .maybeSingle();
      data = global ?? null;
    }

    if (!data) return base;

    const linha = data as LinhaCusto;
    return {
      moeda: linha.moeda ?? "credito",
      creditos: linha.creditos ?? 0,
      custo_estimado: linha.custo_estimado ?? 0,
      tabela_creditos: linha.tabela_creditos ?? base.tabela_creditos,
    };
  } catch {
    // Tabela ainda não existe: usa default.
    return base;
  }
}
