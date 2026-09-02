// ============================================================
// Configuração centralizada de providers do Enrichment Engine.
//
// Aqui ficam: quais providers existem, ordem padrão do waterfall,
// timeouts, retries e as chaves de API (somente server-side).
// As chaves são lidas de process.env — NUNCA expostas ao cliente.
// ============================================================

import type { DadoTipo } from "./types";

// Chaves de API — somente leitura de process.env (server-side).
export const KEYS = {
  maps: process.env.GOOGLE_MAPS_API_KEY ?? "",
  serper: process.env.SERPER_API_KEY ?? "",
  millionphones: process.env.MILLIONPHONES_API_KEY ?? "",
} as const;

export type ConfigProvider = {
  nome: string;
  ativo: boolean;
  timing_priority: number; // menor = primeiro no waterfall
  timeoutMs: number;
  maxRetries: number;
};

// Config padrão (global). Pode ser sobrescrita por org futuramente.
export const CONFIG_PROVIDERS: Record<string, ConfigProvider> = {
  serper: { nome: "serper", ativo: Boolean(KEYS.serper), timing_priority: 10, timeoutMs: 6000, maxRetries: 1 },
  maps: { nome: "maps", ativo: Boolean(KEYS.maps), timing_priority: 20, timeoutMs: 6000, maxRetries: 0 },
  casadosdados: { nome: "casadosdados", ativo: true, timing_priority: 30, timeoutMs: 6000, maxRetries: 0 },
  brasilapi: { nome: "brasilapi", ativo: true, timing_priority: 40, timeoutMs: 6000, maxRetries: 0 },
  millionphones: { nome: "millionphones", ativo: Boolean(KEYS.millionphones), timing_priority: 50, timeoutMs: 6000, maxRetries: 0 },
  site: { nome: "site", ativo: true, timing_priority: 60, timeoutMs: 6000, maxRetries: 0 },
  patterns: { nome: "patterns", ativo: true, timing_priority: 70, timeoutMs: 2000, maxRetries: 0 },
  minhareceita: { nome: "minhareceita", ativo: true, timing_priority: 45, timeoutMs: 8000, maxRetries: 0 },
  "maps-search": { nome: "maps-search", ativo: true, timing_priority: 15, timeoutMs: 8000, maxRetries: 0 },
};

// Mapa: provider -> tipos de dado que ele consegue completar como
// "sucesso" (só os que realmente validam). Sugeridos/unknown não entram.
export const PROVIDER_SUPORTA: Record<string, DadoTipo[]> = {
  serper: ["telefone", "cargo", "website", "linkedin_empresa"],
  maps: ["telefone", "website"],
  casadosdados: ["dados_cadastrais", "telefone"],
  brasilapi: ["dados_cadastrais", "email", "socios", "telefone", "website"],
  millionphones: ["telefone"],
  site: ["email", "telefone"],
  patterns: ["email"],
  minhareceita: ["dados_cadastrais", "email", "telefone"],
  "maps-search": ["telefone"],
};
