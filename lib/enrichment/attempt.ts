// ============================================================
// Attempt — audita cada tentativa do engine na tabela
// `enriquecimento_attempts` (org-scoped, RLS por organização).
// Registra inclusive cache hits (custo 0) para rastreabilidade.
//
// request_id = crypto.randomUUID() por tentativa: identifica UMA
// execução individual. NÃO é usado como mecanismo de deduplicação.
// ============================================================

import { randomUUID } from "crypto";

import { criarClienteSupabaseAdmin } from "../supabase/admin";
import type { ContextoEnriquecimento, DadoTipo, ResultadoProvider } from "./types";

type RegistroAttempt = {
  organizacao_id: string | null;
  usuario_id: string | null;
  provider: string;
  tipo_dado: DadoTipo;
  alvo_tipo: "contato" | "empresa";
  alvo_id: string | null;
  alvo_chave: string | null;
  success: boolean;
  cache_hit: boolean;
  encontrado: boolean;
  credito_consumido: number;
  custo_estimado: number;
  moeda: "credito" | "brl" | "usd";
  request_id: string | null;
  resultado: string | null;
  fonte: string | null;
  confianca: number | null;
  erro_codigo: string | null;
  erro_mensagem: string | null;
};

export async function registrarAttempt(
  ctx: ContextoEnriquecimento,
  r: ResultadoProvider,
  alvo: { tipo: "contato" | "empresa"; id?: string; chave?: string },
  tipo: DadoTipo,
  custoEstimado: number,
  error: { codigo: string; mensagem: string } | null,
  moeda: "credito" | "brl" | "usd" = "credito"
): Promise<void> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return;

  const registro: RegistroAttempt = {
    organizacao_id: ctx.organizacao_id ?? null,
    usuario_id: ctx.usuario_id ?? null,
    provider: r.provider,
    tipo_dado: tipo,
    alvo_tipo: alvo.tipo,
    alvo_id: alvo.id ?? null,
    alvo_chave: alvo.chave ?? r.dados?.telefones?.[0]?.numero ?? null,
    success: r.ok,
    cache_hit: r.cacheHit,
    encontrado: r.encontrado,
    credito_consumido: r.creditoConsumido,
    custo_estimado: custoEstimado,
    moeda,
    // request_id identifica UMA execução individual (sempre único). Não é
    // usado como mecanismo de deduplicação de auditoria.
    request_id: randomUUID(),
    resultado: JSON.stringify(r.dados ?? {}).slice(0, 2000) || null,
    fonte: r.fonte || null,
    confianca: r.confianca ?? null,
    erro_codigo: error?.codigo ?? r.erro?.codigo ?? null,
    erro_mensagem: error?.mensagem ?? r.erro?.mensagem ?? null,
  };

  try {
    await admin.from("enriquecimento_attempts").insert(registro);
  } catch {
    // Auditoria nunca derruba o fluxo.
  }
}
