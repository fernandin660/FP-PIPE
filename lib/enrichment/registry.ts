// ============================================================
// Registry — registra todos os providers disponíveis.
// Para adicionar um NOVO provider: implementa `Provider` e chama
// `register(provider)` aqui. O Engine não precisa mudar.
// ============================================================

import type { Provider } from "./types";

import { serperProvider } from "../providers/serper";
import { mapsProvider } from "../providers/maps";
import { casadosdadosProvider } from "../providers/casadosdados";
import { brasilapiProvider } from "../providers/brasilapi";
import { millionphonesProvider } from "../providers/millionphones";
import { siteProvider } from "../providers/site";
import { patternsProvider } from "../providers/patterns";
import { minhareceitaProvider } from "../providers/minhareceita";
import { mapsSearchProvider } from "../providers/maps-search";

const _registry = new Map<string, Provider>();

export function register(provider: Provider): void {
  _registry.set(provider.nome, provider);
}

// Registro imediato dos providers atuais (futuramente: Kaspr, Surfe, ContactOut).
register(serperProvider);
register(mapsProvider);
register(casadosdadosProvider);
register(brasilapiProvider);
register(millionphonesProvider);
register(siteProvider);
register(patternsProvider);
register(minhareceitaProvider);
register(mapsSearchProvider);

export function getAllProviders(): Provider[] {
  return Array.from(_registry.values());
}

export function getProvider(nome: string): Provider | null {
  return _registry.get(nome) ?? null;
}
