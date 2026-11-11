import { DEFINICAO_PLANOS, type PlanoChave } from "./planos";

/**
 * Preços dos planos fora do Brasil.
 *
 * Regra definida pelo Fernando (nov/2026): parte do preço dos planos
 * Internacionais em reais, converte pela cotação e soma 10%.
 *  - Europa (francês e espanhol): euro
 *  - Inglês: dólar americano
 *
 * A cotação fica fixa aqui (não muda sozinha) para o preço exibido ser
 * estável. Para reajustar, troque os valores e a data abaixo.
 */
export const COTACAO = {
  data: "2026-11-04",
  // Quantos reais vale 1 unidade da moeda (fechamento comercial).
  EUR: 6.12,
  USD: 5.45,
} as const;

export const ACRESCIMO_INTERNACIONAL = 0.1;

export type Moeda = "BRL" | "EUR" | "USD";

/** Converte reais para a moeda, soma 10% e arredonda para cima (preço inteiro). */
export function converterPreco(valorBrl: number, moeda: Moeda): number {
  if (moeda === "BRL") return valorBrl;
  return Math.ceil((valorBrl / COTACAO[moeda]) * (1 + ACRESCIMO_INTERNACIONAL));
}

export type PlanoInternacional = "silver_intl" | "gold_intl" | "platinum_intl";

export function precoInternacional(plano: PlanoInternacional, moeda: Moeda) {
  const def = DEFINICAO_PLANOS[plano as PlanoChave];
  return {
    mensal: converterPreco(def.precoMensal, moeda),
    anualPorMes: converterPreco(def.precoAnualPorMes, moeda),
  };
}

export function formatarPreco(valor: number, moeda: Moeda, local: string): string {
  return new Intl.NumberFormat(local, {
    style: "currency",
    currency: moeda,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(valor);
}
