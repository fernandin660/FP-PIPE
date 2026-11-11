import { ehEstagioGanho, ehEstagioPerdido, probabilidadeDoEstagio } from "./crm-previsao";

/*
 * Cálculo dos relatórios do CRM (estilo "Insights" do Pipedrive).
 * Funções puras: recebem as linhas já carregadas do banco e devolvem os
 * números prontos para a tela. Datas agrupadas no horário de Brasília.
 */

const FUSO = "America/Sao_Paulo";
const DIA = 86_400_000;
export const DIAS_PARADO = 14;

export type EtapaRel = { id: string; nome: string; pipeline_id: string; ordem_estagio: number; probabilidade: number | null };
export type NegocioRel = {
  id: string;
  company_id: string;
  stage_id: string;
  pipeline_id: string;
  responsavel_id: string | null;
  valor_oportunidade: number | null;
  titulo: string | null;
  data_prevista: string | null;
  motivo_perda: string | null;
  criado_em: string;
  atualizado_em: string;
};
export type EventoRel = {
  lead_pipeline_id: string | null;
  tipo_evento: string;
  stage_origem_id: string | null;
  stage_destino_id: string | null;
  usuario_id: string | null;
  dados: Record<string, unknown> | null;
  criado_em: string;
};
export type MetaRel = {
  id: string;
  usuario_id: string | null;
  pipeline_id: string | null;
  tipo: "valor_ganho" | "negocios_ganhos" | "negocios_criados" | "atividades_concluidas";
  periodo: "mes" | "trimestre";
  alvo: number;
};

export type EntradaRelatorio = {
  etapas: EtapaRel[];
  negocios: NegocioRel[];
  eventos: EventoRel[];
  metas: MetaRel[];
  membros: Map<string, string>;
  empresas: Map<string, string>;
  de: number;
  ate: number;
  agora: number;
  funil: string | null;
  responsavel: string | null;
};

/** "2026-11" no horário de Brasília. */
export function mesBrasilia(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit" }).format(new Date(ms)).slice(0, 7);
}
function diaBrasilia(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}
/** Início (inclusive) e fim (exclusive) do mês ou trimestre atual em Brasília. */
export function periodoAtual(periodo: "mes" | "trimestre", agora: number): { de: number; ate: number; rotulo: string } {
  const [a, m] = mesBrasilia(agora).split("-").map(Number);
  const mesInicio = periodo === "mes" ? m : Math.floor((m - 1) / 3) * 3 + 1;
  const meses = periodo === "mes" ? 1 : 3;
  const inicio = Date.parse(`${a}-${String(mesInicio).padStart(2, "0")}-01T00:00:00-03:00`);
  const fimAno = mesInicio + meses > 12 ? a + 1 : a;
  const fimMes = ((mesInicio + meses - 1) % 12) + 1;
  const fim = Date.parse(`${fimAno}-${String(fimMes).padStart(2, "0")}-01T00:00:00-03:00`);
  const rotulo = periodo === "mes" ? `${String(m).padStart(2, "0")}/${a}` : `${Math.floor((m - 1) / 3) + 1}º tri ${a}`;
  return { de: inicio, ate: fim, rotulo };
}
/** Meses (AAAA-MM) entre duas datas, inclusive. */
function mesesEntre(de: number, ate: number): string[] {
  const out: string[] = [];
  let [a, m] = mesBrasilia(de).split("-").map(Number);
  const fim = mesBrasilia(ate);
  for (let i = 0; i < 60; i++) {
    const k = `${a}-${String(m).padStart(2, "0")}`;
    out.push(k);
    if (k >= fim) break;
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return out;
}
function mediana(v: number[]): number {
  if (!v.length) return 0;
  const s = [...v].sort((x, y) => x - y);
  const meio = Math.floor(s.length / 2);
  return s.length % 2 ? s[meio] : (s[meio - 1] + s[meio]) / 2;
}
const arred = (n: number, c = 1) => Math.round(n * 10 ** c) / 10 ** c;

const TIPOS_ATIVIDADE_CONTAM = new Set(["email", "telefone", "ligacao", "whatsapp", "linkedin", "reuniao", "tarefa"]);

type Desfecho = { tipo: "ganho" | "perdido"; em: number } | null;

export function calcularRelatorios(e: EntradaRelatorio) {
  const etapaPorId = new Map(e.etapas.map((x) => [x.id, x]));
  const ehGanho = (id: string | null | undefined) => (id ? ehEstagioGanho(etapaPorId.get(id)?.nome) : false);
  const ehPerdido = (id: string | null | undefined) => (id ? ehEstagioPerdido(etapaPorId.get(id)?.nome) : false);
  const nomePessoa = (id: string | null) => (id ? e.membros.get(id) ?? "Ex-membro" : "Sem responsável");

  // Eventos agrupados por negócio, em ordem cronológica.
  const eventosPorNegocio = new Map<string, EventoRel[]>();
  for (const ev of e.eventos) {
    if (!ev.lead_pipeline_id) continue;
    const lista = eventosPorNegocio.get(ev.lead_pipeline_id) ?? [];
    lista.push(ev);
    eventosPorNegocio.set(ev.lead_pipeline_id, lista);
  }
  for (const l of eventosPorNegocio.values()) l.sort((a, b) => a.criado_em.localeCompare(b.criado_em));

  /** Quando o negócio foi ganho/perdido (última entrada na etapa final). */
  function desfecho(n: NegocioRel): Desfecho {
    const tipo = ehGanho(n.stage_id) ? "ganho" : ehPerdido(n.stage_id) ? "perdido" : null;
    if (!tipo) return null;
    const movs = (eventosPorNegocio.get(n.id) ?? []).filter((ev) => ev.tipo_evento === "mudanca_estagio" && ev.stage_destino_id === n.stage_id);
    const em = movs.length ? Date.parse(movs[movs.length - 1].criado_em) : Date.parse(n.atualizado_em);
    return { tipo, em };
  }

  const todos = e.negocios.map((n) => ({ n, fim: desfecho(n) }));
  const doFiltro = todos.filter(({ n }) => (!e.funil || n.pipeline_id === e.funil) && (!e.responsavel || (n.responsavel_id ?? "sem") === e.responsavel));
  const noPeriodo = (ms: number) => ms >= e.de && ms <= e.ate;

  // --- Desempenho ----------------------------------------------------------
  const meses = mesesEntre(e.de, e.ate);
  const porMes = new Map(meses.map((m) => [m, { mes: m, criados: 0, ganhos: 0, perdidos: 0, valorGanho: 0 }]));
  const pessoas = new Map<string, { usuario_id: string; nome: string; criados: number; ganhos: number; perdidos: number; valorGanho: number; abertos: number; valorAberto: number; atividades: number }>();
  const pessoa = (id: string | null) => {
    const k = id ?? "sem";
    if (!pessoas.has(k)) pessoas.set(k, { usuario_id: k, nome: nomePessoa(id), criados: 0, ganhos: 0, perdidos: 0, valorGanho: 0, abertos: 0, valorAberto: 0, atividades: 0 });
    return pessoas.get(k)!;
  };
  for (const [id] of e.membros) if (!e.responsavel || e.responsavel === id) pessoa(id);

  let criados = 0, ganhos = 0, perdidos = 0, valorGanho = 0, valorPerdido = 0, abertos = 0, valorAberto = 0;
  const ciclos: number[] = [];
  const motivos = new Map<string, number>();
  for (const { n, fim } of doFiltro) {
    const v = n.valor_oportunidade ?? 0;
    const p = pessoa(n.responsavel_id);
    const criadoEm = Date.parse(n.criado_em);
    if (noPeriodo(criadoEm)) {
      criados++;
      p.criados++;
      const m = porMes.get(mesBrasilia(criadoEm));
      if (m) m.criados++;
    }
    if (!fim) {
      abertos++;
      valorAberto += v;
      p.abertos++;
      p.valorAberto += v;
      continue;
    }
    if (!noPeriodo(fim.em)) continue;
    const m = porMes.get(mesBrasilia(fim.em));
    if (fim.tipo === "ganho") {
      ganhos++;
      valorGanho += v;
      p.ganhos++;
      p.valorGanho += v;
      if (m) {
        m.ganhos++;
        m.valorGanho += v;
      }
      ciclos.push((fim.em - criadoEm) / DIA);
    } else {
      perdidos++;
      valorPerdido += v;
      p.perdidos++;
      if (m) m.perdidos++;
      const motivo = n.motivo_perda?.trim() || "Sem motivo informado";
      motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1);
    }
  }

  // --- Tempo em cada etapa e negócios parados -----------------------------
  const duracoes = new Map<string, number[]>();
  const agoraNaEtapa = new Map<string, number[]>();
  const parados: Array<{ id: string; company_id: string; titulo: string; etapa: string; dias: number; responsavel: string; valor: number | null }> = [];
  for (const { n, fim } of doFiltro) {
    const evs = eventosPorNegocio.get(n.id) ?? [];
    const movs = evs.filter((ev) => ev.tipo_evento === "mudanca_estagio" && ev.stage_destino_id);
    let etapaAtual: string | null = movs[0]?.stage_origem_id ?? evs.find((ev) => ev.tipo_evento === "lead_adicionado")?.stage_destino_id ?? n.stage_id;
    let desde = Date.parse(n.criado_em);
    for (const mv of movs) {
      const t = Date.parse(mv.criado_em);
      if (etapaAtual && noPeriodo(t)) {
        const l = duracoes.get(etapaAtual) ?? [];
        l.push(Math.max(0, (t - desde) / DIA));
        duracoes.set(etapaAtual, l);
      }
      etapaAtual = mv.stage_destino_id;
      desde = t;
    }
    if (!fim) {
      const l = agoraNaEtapa.get(n.stage_id) ?? [];
      l.push((e.agora - desde) / DIA);
      agoraNaEtapa.set(n.stage_id, l);

      const ultimo = Math.max(Date.parse(n.atualizado_em), desde, ...evs.map((ev) => Date.parse(ev.criado_em)));
      const dias = Math.floor((e.agora - ultimo) / DIA);
      if (dias >= DIAS_PARADO) {
        parados.push({
          id: n.id,
          company_id: n.company_id,
          titulo: n.titulo?.trim() || e.empresas.get(n.company_id) || "Negócio",
          etapa: etapaPorId.get(n.stage_id)?.nome ?? "—",
          dias,
          responsavel: nomePessoa(n.responsavel_id),
          valor: n.valor_oportunidade,
        });
      }
    }
  }
  const etapasDoFunil = e.etapas
    .filter((x) => !e.funil || x.pipeline_id === e.funil)
    .sort((a, b) => a.ordem_estagio - b.ordem_estagio)
    .filter((x) => !ehEstagioGanho(x.nome) && !ehEstagioPerdido(x.nome));
  const tempoEtapas = etapasDoFunil.map((x) => {
    const d = duracoes.get(x.id) ?? [];
    const agoraL = agoraNaEtapa.get(x.id) ?? [];
    return {
      stage_id: x.id,
      nome: x.nome,
      mediaDias: d.length ? arred(d.reduce((s, y) => s + y, 0) / d.length) : null,
      medianaDias: d.length ? arred(mediana(d)) : null,
      amostras: d.length,
      agora: agoraL.length,
      agoraMediaDias: agoraL.length ? arred(agoraL.reduce((s, y) => s + y, 0) / agoraL.length) : null,
    };
  });
  parados.sort((a, b) => b.dias - a.dias);

  // --- Atividades ----------------------------------------------------------
  const negocioPorId = new Map(e.negocios.map((n) => [n.id, n]));
  const porTipo: Record<string, number> = {};
  const porPessoaAtiv = new Map<string, { usuario_id: string; nome: string; total: number; noPrazo: number; porTipo: Record<string, number> }>();
  let concluidas = 0, noPrazo = 0, atrasadasAbertas = 0;
  type AtivConcluida = { dono: string | null; em: number; pipeline: string | null };
  const concluidasTodas: AtivConcluida[] = [];
  for (const ev of e.eventos) {
    if (ev.tipo_evento !== "atividade" && ev.tipo_evento !== "atividade_programada") continue;
    const d = ev.dados ?? {};
    if (d.cancelada === true) continue;
    const tipo = typeof d.tipo_atividade === "string" ? d.tipo_atividade : "tarefa";
    if (!TIPOS_ATIVIDADE_CONTAM.has(tipo)) continue;
    const negocio = ev.lead_pipeline_id ? negocioPorId.get(ev.lead_pipeline_id) : undefined;
    const dono = (typeof d.concluida_por === "string" ? d.concluida_por : null) ?? ev.usuario_id ?? negocio?.responsavel_id ?? null;
    const prazo = typeof d.data_hora_atividade === "string" ? Date.parse(d.data_hora_atividade) : NaN;

    if (d.concluida === true) {
      const em = typeof d.concluida_em === "string" ? Date.parse(d.concluida_em) : NaN;
      if (Number.isNaN(em)) continue;
      concluidasTodas.push({ dono, em, pipeline: negocio?.pipeline_id ?? null });
      if (!noPeriodo(em)) continue;
      if (e.funil && negocio?.pipeline_id !== e.funil) continue;
      if (e.responsavel && (dono ?? "sem") !== e.responsavel) continue;
      concluidas++;
      porTipo[tipo] = (porTipo[tipo] ?? 0) + 1;
      const k = dono ?? "sem";
      if (!porPessoaAtiv.has(k)) porPessoaAtiv.set(k, { usuario_id: k, nome: nomePessoa(dono), total: 0, noPrazo: 0, porTipo: {} });
      const pa = porPessoaAtiv.get(k)!;
      pa.total++;
      pa.porTipo[tipo] = (pa.porTipo[tipo] ?? 0) + 1;
      const dentro = Number.isNaN(prazo) || diaBrasilia(em) <= diaBrasilia(prazo);
      if (dentro) {
        noPrazo++;
        pa.noPrazo++;
      }
      if (pessoas.has(k)) pessoas.get(k)!.atividades++;
    } else if (!Number.isNaN(prazo) && prazo < e.agora) {
      if (e.funil && negocio?.pipeline_id !== e.funil) continue;
      if (e.responsavel && (negocio?.responsavel_id ?? "sem") !== e.responsavel) continue;
      atrasadasAbertas++;
    }
  }

  // --- Previsão por mês de fechamento --------------------------------------
  const hoje = diaBrasilia(e.agora);
  const previsao = new Map<string, { mes: string; negocios: number; valor: number; ponderado: number }>();
  const semData = { negocios: 0, valor: 0 };
  for (const { n, fim } of doFiltro) {
    if (fim) continue;
    const v = n.valor_oportunidade ?? 0;
    if (!n.data_prevista) {
      semData.negocios++;
      semData.valor += v;
      continue;
    }
    const k = n.data_prevista < hoje ? "vencidas" : n.data_prevista.slice(0, 7);
    const linha = previsao.get(k) ?? { mes: k, negocios: 0, valor: 0, ponderado: 0 };
    const et = etapaPorId.get(n.stage_id);
    linha.negocios++;
    linha.valor += v;
    linha.ponderado += et ? (v * probabilidadeDoEstagio(et)) / 100 : 0;
    previsao.set(k, linha);
  }
  const previsaoLista = [...previsao.values()].sort((a, b) => (a.mes === "vencidas" ? -1 : b.mes === "vencidas" ? 1 : a.mes.localeCompare(b.mes)));

  // --- Metas (sempre no período atual: mês ou trimestre) -------------------
  const metas = e.metas.map((m) => {
    const p = periodoAtual(m.periodo, e.agora);
    const dentro = (ms: number) => ms >= p.de && ms < p.ate;
    const casa = (n: NegocioRel) => (!m.pipeline_id || n.pipeline_id === m.pipeline_id) && (!m.usuario_id || n.responsavel_id === m.usuario_id);
    let atual = 0;
    if (m.tipo === "negocios_criados") atual = todos.filter(({ n }) => casa(n) && dentro(Date.parse(n.criado_em))).length;
    if (m.tipo === "negocios_ganhos") atual = todos.filter(({ n, fim }) => casa(n) && fim?.tipo === "ganho" && dentro(fim.em)).length;
    if (m.tipo === "valor_ganho")
      atual = todos.filter(({ n, fim }) => casa(n) && fim?.tipo === "ganho" && dentro(fim.em)).reduce((s, { n }) => s + (n.valor_oportunidade ?? 0), 0);
    if (m.tipo === "atividades_concluidas")
      atual = concluidasTodas.filter((a) => dentro(a.em) && (!m.usuario_id || a.dono === m.usuario_id) && (!m.pipeline_id || a.pipeline === m.pipeline_id)).length;
    // Ritmo esperado: quanto do período já passou.
    const decorrido = Math.min(1, Math.max(0, (e.agora - p.de) / (p.ate - p.de)));
    return {
      ...m,
      nome: m.usuario_id ? nomePessoa(m.usuario_id) : "Equipe",
      periodo_rotulo: p.rotulo,
      atual,
      percentual: m.alvo > 0 ? Math.round((atual / m.alvo) * 100) : 0,
      esperado: Math.round(decorrido * 100),
    };
  });

  return {
    resumo: {
      criados,
      ganhos,
      perdidos,
      valorGanho,
      valorPerdido,
      taxaGanho: ganhos + perdidos ? Math.round((ganhos / (ganhos + perdidos)) * 100) : null,
      ticketMedio: ganhos ? Math.round(valorGanho / ganhos) : null,
      cicloMedioDias: ciclos.length ? arred(ciclos.reduce((s, x) => s + x, 0) / ciclos.length) : null,
      abertos,
      valorAberto,
      parados: parados.length,
    },
    porMes: [...porMes.values()],
    porPessoa: [...pessoas.values()]
      .map((p) => ({ ...p, taxaGanho: p.ganhos + p.perdidos ? Math.round((p.ganhos / (p.ganhos + p.perdidos)) * 100) : null }))
      .filter((p) => p.usuario_id !== "sem" || p.criados + p.ganhos + p.perdidos + p.abertos > 0)
      .sort((a, b) => b.valorGanho - a.valorGanho || b.ganhos - a.ganhos || b.criados - a.criados),
    motivosPerda: [...motivos.entries()].map(([motivo, total]) => ({ motivo, total })).sort((a, b) => b.total - a.total),
    tempoEtapas,
    parados: parados.slice(0, 15),
    atividades: {
      concluidas,
      noPrazo,
      percentualNoPrazo: concluidas ? Math.round((noPrazo / concluidas) * 100) : null,
      atrasadasAbertas,
      porTipo,
      porPessoa: [...porPessoaAtiv.values()].sort((a, b) => b.total - a.total),
    },
    previsao: previsaoLista,
    semData,
    metas,
  };
}

export type Relatorio = ReturnType<typeof calcularRelatorios>;
