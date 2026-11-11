/** Probabilidade padrão de fechamento pelo nome do estágio (quando a empresa não definiu). */
const PADRAO: Record<string, number> = {
  NOVO: 5,
  "EM ABORDAGEM": 10,
  "CONTATO REALIZADO": 15,
  "FOLLOW-UP": 20,
  RESPONDEU: 30,
  QUALIFICADO: 40,
  "REUNIÃO AGENDADA": 50,
  OPORTUNIDADE: 70,
  GANHO: 100,
  PERDIDO: 0,
};

export function probabilidadeDoEstagio(estagio: { nome: string; probabilidade?: number | null }): number {
  if (typeof estagio.probabilidade === "number") return estagio.probabilidade;
  return PADRAO[estagio.nome.trim().toUpperCase()] ?? 0;
}

export function ehEstagioPerdido(nome: string | null | undefined): boolean {
  return (nome ?? "").trim().toUpperCase() === "PERDIDO";
}

export function ehEstagioGanho(nome: string | null | undefined): boolean {
  return (nome ?? "").trim().toUpperCase() === "GANHO";
}

export const MOTIVOS_PERDA = [
  "Preço",
  "Escolheu um concorrente",
  "Sem orçamento agora",
  "Não é o momento",
  "Não tem a necessidade",
  "Sem resposta",
  "Outro",
] as const;
