// ============================================================
// Router — decide a lista ordenada de providers candidatos para
// um pedido. Hoje filtra por tipo_suportado + ativo + ordem de
// config. Estrutura pronta para, futuramente, considerar custo,
// disponibilidade, créditos restantes, qualidade e regras por org.
//
// Não implementamos heurística de otimização aqui — apenas o
// esqueleto que permite adicioná-las depois sem mexer no Engine.
// ============================================================

import { CONFIG_PROVIDERS, PROVIDER_SUPORTA } from "./config";
import { getAllProviders } from "./registry";
import type { DadoTipo, Provider } from "./types";

export type CriterioRouter = {
  orgId?: string | null;
  tipo: DadoTipo;
};

// Ordem padrão: configuração (timing_priority) crescente.
// Parcial/não-sucesso de um provider não invalida o resto do waterfall.
export function selecionarCandidatos(criterio: CriterioRouter): Provider[] {
  const todos = getAllProviders();

  return todos
    .filter((p) => {
      const cfg = CONFIG_PROVIDERS[p.nome];
      if (cfg && !cfg.ativo) return false;
      return (PROVIDER_SUPORTA[p.nome] ?? []).includes(criterio.tipo);
    })
    .sort((a, b) => {
      const pa = CONFIG_PROVIDERS[a.nome]?.timing_priority ?? 999;
      const pb = CONFIG_PROVIDERS[b.nome]?.timing_priority ?? 999;
      return pa - pb;
    });
}

// Em qual tipo de dado consideramos o resultado "válido" (para o waterfall).
export function tipoValidoParaSucesso(tipo: DadoTipo, provider: Provider): boolean {
  return (PROVIDER_SUPORTA[provider.nome] ?? []).includes(tipo);
}
