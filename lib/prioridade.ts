// ============================================================
// Prioridade comercial — fórmula DETERMINÍSTICA e documentada.
//
// NÃO depende de IA. IA é usada apenas para interpretação/recomendação.
// As regras aqui são analisáveis e mudam de forma previsível.
//
// Entradas (todas opcionais; ausência = dado não disponível):
//   icpScore             → companies.score (0-100)
//   temSegmento          → companies.segmento_icp preenchido
//   temPorte             → companies.porte preenchido
//   capitalSocial        → companies.capital_social (numeric)
//   dataAbertura         → companies.data_abertura (YYYY-MM-DD)
//   temTelefone          → companies.telefone preenchido
//   temEmail             → companies.email preenchido
//   decisorIdentificado  → existe decisor/campeão identificado
//   decisorContato       → decisor/campeão tem e-mail ou telefone
//   confirmado           → companies.confirmado = true
//   numSinais            → contagem de sinais com relevância >= média
//   numAtividades        → contagem de atividades (tipo atividade/programada)
//   ultimaAtividadeEm    → timestamp ISO da última atividade (ou null)
//   stageNome            → nome do estágio atual do lead
//
// Pesos:
//   ICP fit                 até 40 pts  (score/100 * 40)
//   Capacidade de contato   até 15 pts  (decisor com contato = 15; empresa com
//                                      telefone OU e-mail = 10; sem nenhum = 0)
//   Contexto cadastral      até 10 pts  (porte + segmento + capital social)
//   Sinais comerciais       até 15 pts  (min(15, numSinais * 5))
//   Engagement              até 12 pts  (atividades recentes)
//   Estágio do pipeline     até 8 pts   (estágio avançado = mais quente)
//
// Faixas:
//   >= 70  → 🔥 ALTA
//   >= 40  → 🟡 MÉDIA
//   < 40   → ⚪ BAIXA
//
// Regras de segurança:
//   - Empresas GANHO e PERDIDO NÃO recebem prioridade de ataque (nivel "baixa",
//     motivo explícito) para não poluir a fila de prospecção.
//   - NUNCA inventa dado: só usa o que chega como entrada real.
// ============================================================

export type PrioridadeNivel = "alta" | "media" | "baixa";

export type PrioridadeResultado = {
  nivel: PrioridadeNivel;
  rotulo: string; // "🔥 ALTA" | "🟡 MÉDIA" | "⚪ BAIXA"
  pontos: number;
  fatoresPositivos: string[];
  fatoresNegativos: string[];
  motivos: string[]; // motivos individuais (por que prospectar)
  dadosInsuficientes: boolean;
};

export type EntradaPrioridade = {
  icpScore?: number | null;
  temSegmento?: boolean;
  temPorte?: boolean;
  capitalSocial?: number | null;
  dataAbertura?: string | null;
  temTelefone?: boolean;
  temEmail?: boolean;
  decisorIdentificado?: boolean;
  decisorContato?: boolean;
  confirmado?: boolean;
  numSinais?: number;
  numAtividades?: number;
  ultimaAtividadeEm?: string | null;
  stageNome?: string | null;
};

// Estágios que encerram o ciclo — não são alvos de prospecção.
const ESTAGIOS_ENCERRADOS = new Set(["ganho", "perdido"]);

function temTexto(v?: string | null): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function etapaStage(stageNome?: string | null): number {
  const s = (stageNome ?? "").toLowerCase();
  if (!s) return 0;
  if (s.includes("oportunidade") || s.includes("negocia") || s.includes("proposta"))
    return 8;
  if (s.includes("reuni") || s.includes("conversando") || s.includes("respondeu"))
    return 6;
  if (s.includes("contato") || s.includes("abordagem") || s.includes("follow"))
    return 4;
  if (s.includes("qualificado") || s.includes("novo")) return 2;
  return 0;
}

export function calcularPrioridade(e: EntradaPrioridade): PrioridadeResultado {
  const icp = typeof e.icpScore === "number" ? Math.max(0, Math.min(100, e.icpScore)) : null;

  // --- ICP fit ---
  const pontosIcp = icp === null ? 0 : Math.round((icp / 100) * 40);

  // --- Capacidade de contato ---
  let pontosContato = 0;
  if (e.decisorIdentificado && e.decisorContato) pontosContato = 15;
  else if (e.temTelefone || e.temEmail) pontosContato = 10;

  // --- Contexto cadastral ---
  let pontosCadastro = 0;
  if (e.temSegmento) pontosCadastro += 4;
  if (e.temPorte) pontosCadastro += 3;
  if (typeof e.capitalSocial === "number" && e.capitalSocial >= 50000)
    pontosCadastro += 3;

  // --- Sinais comerciais ---
  const pontosSinais = Math.min(15, (e.numSinais ?? 0) * 5);

  // --- Engagement (atividades recentes) ---
  let pontosEngajamento = 0;
  const numAtiv = e.numAtividades ?? 0;
  if (numAtiv > 0) {
    pontosEngajamento += 6;
    if (e.ultimaAtividadeEm) {
      const dias =
        (Date.now() - new Date(e.ultimaAtividadeEm).getTime()) / 86400000;
      if (dias <= 3) pontosEngajamento += 6;
      else if (dias <= 7) pontosEngajamento += 4;
      else if (dias <= 30) pontosEngajamento += 2;
    }
  }

  // --- Estágio ---
  const pontosStage = etapaStage(e.stageNome);

  const pontos = Math.min(
    100,
    pontosIcp + pontosContato + pontosCadastro + pontosSinais + pontosEngajamento + pontosStage
  );

  // --- Fatores positivos (reais, derivados apenas das entradas) ---
  const positivos: string[] = [];
  if (icp !== null) {
    if (icp >= 80) positivos.push("ICP muito alto (score ≥ 80)");
    else if (icp >= 50) positivos.push("ICP alto (score ≥ 50)");
    else positivos.push(`ICP intermediário (score ${icp})`);
  }
  if (e.temSegmento) positivos.push("Segmento identificado");
  if (e.temPorte) positivos.push("Porte identificado");
  if (typeof e.capitalSocial === "number" && e.capitalSocial >= 50000)
    positivos.push("Capital social relevante");
  if (e.decisorIdentificado) positivos.push("Decisor identificado");
  if (e.decisorContato) positivos.push("Decisor com contato disponível");
  else if (e.temTelefone || e.temEmail) positivos.push("Contato da empresa disponível");
  if ((e.numSinais ?? 0) > 0) positivos.push(`${e.numSinais} sinal(is) comercial(is) relevante(s)`);
  if ((e.numAtividades ?? 0) > 0) positivos.push("Tem atividades registradas");
  if (e.confirmado) positivos.push("Dados empresariais confirmados");
  if (pontosStage >= 6) positivos.push("Estágio quente (em negociação/reunião)");

  // --- Fatores negativos ---
  const negativos: string[] = [];
  if (icp === null) negativos.push("Sem score de ICP");
  else if (icp < 40) negativos.push("ICP baixo");
  if (!e.decisorIdentificado) negativos.push("Nenhum decisor identificado");
  if (!e.temTelefone && !e.temEmail) negativos.push("Sem telefone/e-mail disponível");
  if (pontosEngajamento === 0) negativos.push("Sem atividade recente");

  // Lógica de estágio de encerramento
  const encerrado = ESTAGIOS_ENCERRADOS.has(
    (e.stageNome ?? "").toLowerCase().trim()
  );

  let nivel: PrioridadeNivel;
  if (encerrado) {
    nivel = "baixa";
  } else if (pontos >= 70) {
    nivel = "alta";
  } else if (pontos >= 40) {
    nivel = "media";
  } else {
    nivel = "baixa";
  }

  const dadosInsuficientes =
    icp === null && !e.decisorIdentificado && !e.temTelefone && !e.temEmail;

  // Motivos (por que prospectar) — uma frase por fator positivo.
  const motivos: string[] = [];
  if (dadosInsuficientes) {
    motivos.push("Dados insuficientes para uma recomendação confiável.");
  } else {
    const etapa = pontosStage >= 6 ? "Estágio quente" : "Estágio em andamento";
    let contato =
      e.decisorContato
        ? "Decisor alcançável"
        : e.temTelefone || e.temEmail
          ? "Contato disponível"
          : "Contato a descobrir";
    if (icp !== null && icp >= 50) motivos.push(`ICP forte (${icp}/100)`);
    if (e.decisorIdentificado) motivos.push("Decisor mapeado");
    if ((e.numSinais ?? 0) > 0) motivos.push("Sinais comerciais detectados");
    if ((e.numAtividades ?? 0) > 0 && e.ultimaAtividadeEm) {
      const dias = Math.max(
        0,
        Math.round(
          (Date.now() - new Date(e.ultimaAtividadeEm).getTime()) / 86400000
        )
      );
      motivos.push(
        `Último contato há ${dias} dia${dias === 1 ? "" : "s"}${dias === 0 ? " (hoje)" : ""}`
      );
    }
    if (motivos.length === 0 && dadosInsuficientes === false) {
      motivos.push("Sem razões fortes — avaliar antes de priorizar.");
    }
    // lista legível dos dois principais motivos determinísticos
    motivos.splice(0, 0, contato, etapa);
  }

  return {
    nivel,
    rotulo: nivel === "alta" ? "🔥 ALTA" : nivel === "media" ? "🟡 MÉDIA" : "⚪ BAIXA",
    pontos,
    fatoresPositivos: positivos,
    fatoresNegativos: negativos,
    motivos,
    dadosInsuficientes,
  };
}
