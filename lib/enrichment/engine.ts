// ============================================================
// Engine — ÚNICO ponto de entrada para qualquer enriquecimento.
// Todos os call sites devem passar por aqui. Não conhece o nome de
// providers específicos (o router/registry decidem). Toda tentativa
// é auditada (enriquecimento_attempts) e custo é aplicado via camada
// única de créditos.
// ============================================================

import { registrarAttempt } from "./attempt";
import { lerCache } from "./cache";
import { custoPara, type Custo } from "./cost";
import { estornar, reservar } from "./credits";
import { getProvider } from "./registry";
import { selecionarCandidatos } from "./router";
import { ehValido, rodarWaterfall } from "./waterfall";
import type {
  Alvo,
  ContextoEnriquecimento,
  DadoTipo,
  Pedido,
  Provider,
  ResultadoEngine,
  ResultadoProvider,
  TelefoneEncontrado,
} from "./types";

// Cache key derivado do alvo.
function chaveCache(alvo: Alvo): string {
  return alvo.chave ?? alvo.linkedin ?? "";
}

// Executa o pipeline completo: cache → waterfall → ledger/custo.
export async function enrich(
  pedido: Pedido,
  ctx: ContextoEnriquecimento
): Promise<ResultadoEngine> {
  const alvo = pedido.alvo;
  const key = chaveCache(alvo);

  // 1) Cache (reuso barato). Hoje cobre telefones/website (schema legado).
  if (key && pedido.tipo === "telefone") {
    const cache = await lerCache<{ telefones: TelefoneEncontrado[] | string[]; website?: string }>(
      key,
      "telefone"
    );
    if (cache && (cache.dados.telefones?.length ?? 0) > 0) {
      const telefones = (cache.dados.telefones ?? []).map((t): TelefoneEncontrado =>
        typeof t === "string"
          ? { numero: t, tipo: "company", fonte: cache.meta.fonte, confianca: cache.meta.confianca }
          : t
      );
      const r: ResultadoProvider = {
        provider: cache.meta.provider_origem,
        requestId: `cache:${key}`,
        ok: true,
        encontrado: true,
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: true,
        fonte: cache.meta.fonte,
        confianca: cache.meta.confianca,
        dados: { telefones, website: cache.dados.website ?? null },
      };
      // Audita o cache hit com custo 0 (rastreabilidade).
      await registrarAttempt(ctx, r, alvo, "telefone", 0, null);
      return {
        ok: true,
        tipo: "telefone",
        alvo,
        fonte: r.fonte,
        confianca: r.confianca,
        cacheHit: true,
        custoEstimado: 0,
        creditoConsumido: 0,
        moeda: "credito",
        dados: r.dados,
      };
    }
  }

  // 2) Candidatos ordenados (filtro por tipo + ativo).
  const candidatos = selecionarCandidatos({ orgId: ctx.organizacao_id, tipo: pedido.tipo });

  // 3) Custo de cada candidato (matriz + defaults).
  const custos = new Map<string, Custo>();
  for (const p of candidatos) {
    custos.set(p.nome, await custoPara(p.nome, pedido.tipo, ctx.organizacao_id));
  }

  // 4) Waterfall.
  return rodarWaterfall(pedido, ctx, candidatos, custos);
}

// Executa UM provider específico (usado para instrumentar os
// orquestradores existentes durante a migração). NÃO muda os dados
// retornados — apenas audita + aplica custo + metadados de cache.
// O retorno é o ResultadoProvider original, para o chamador continuar
// com a mesma lógica de merge.
export async function runProvider(
  providerNome: string,
  pedido: Pedido,
  ctx: ContextoEnriquecimento
): Promise<ResultadoProvider> {
  const provider = getProvider(providerNome);
  if (!provider) {
    return {
      provider: providerNome,
      requestId: `${pedido.tipo}:${pedido.alvo.chave ?? ""}`,
      ok: false,
      encontrado: false,
      erro: { codigo: "not_found", mensagem: "Provider não registrado" },
      creditoConsumido: 0,
      custoEstimado: 0,
      moeda: "credito",
      cacheHit: false,
      fonte: providerNome,
      confianca: 0,
    };
  }

  const custo = await custoPara(providerNome, pedido.tipo, ctx.organizacao_id);
  const reservado = await reservar(ctx.organizacao_id, custo);

  let resultado: ResultadoProvider;
  try {
    resultado = await provider.enrich(pedido, pedido.alvo);
  } catch (e) {
    resultado = {
      provider: providerNome,
      requestId: `${pedido.tipo}:${pedido.alvo.chave ?? ""}`,
      ok: false,
      encontrado: false,
      erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
      creditoConsumido: reservado,
      custoEstimado: custo.custo_estimado,
      moeda: custo.moeda,
      cacheHit: false,
      fonte: providerNome,
      confianca: 0,
    };
  }

  const consumiu = reservado > 0 && resultado.ok && resultado.encontrado ? reservado : 0;
  resultado.creditoConsumido = consumiu;
  if (consumiu < reservado) await estornar(ctx.organizacao_id, custo, reservado - consumiu);

  await registrarAttempt(
    ctx,
    resultado,
    pedido.alvo,
    pedido.tipo,
    custo.custo_estimado,
    resultado.erro ?? null,
    custo.moeda
  );

  return resultado;
}

export { ehValido };
