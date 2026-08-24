export type PlanoChave = "teste" | "silver" | "gold" | "platinum";
export type Ciclo = "mensal" | "anual";

export interface DefinicaoPlano {
  nome: string;
  precoMensal: number;
  precoAnualPorMes: number;
  empresasMes: number;
  temBuscador: boolean;
  buscasMes: number | null;
}

export const DEFINICAO_PLANOS: Record<PlanoChave, DefinicaoPlano> = {
  teste: {
    nome: "Teste grátis",
    precoMensal: 0,
    precoAnualPorMes: 0,
    empresasMes: 50,
    temBuscador: true,
    buscasMes: 5,
  },
  silver: {
    nome: "Silver",
    precoMensal: 147,
    precoAnualPorMes: 117,
    empresasMes: 500,
    temBuscador: false,
    buscasMes: null,
  },
  gold: {
    nome: "Gold",
    precoMensal: 297,
    precoAnualPorMes: 227,
    empresasMes: 1500,
    temBuscador: true,
    buscasMes: 400,
  },
  platinum: {
    nome: "Platinum",
    precoMensal: 497,
    precoAnualPorMes: 387,
    empresasMes: 3000,
    temBuscador: true,
    buscasMes: 1000,
  },
};

export function precoDoPlano(plano: PlanoChave, ciclo: Ciclo): number {
  const def = DEFINICAO_PLANOS[plano];
  if (!def) throw new Error("Plano desconhecido");
  return ciclo === "anual"
    ? def.precoAnualPorMes * 12
    : def.precoMensal;
}

export function duracaoDias(ciclo: Ciclo): number {
  return ciclo === "anual" ? 365 : 30;
}
