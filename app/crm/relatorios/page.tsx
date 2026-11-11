"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import MolduraCrm from "../../../components/crm/MolduraCrm";
import { Aviso, BotaoPrimario, BotaoSecundario, Janela, Rotulo, classeCampo, formatarMoeda } from "../../../components/crm/ui";
import type { Relatorio } from "../../../lib/crm-relatorios";

type Resposta = Relatorio & {
  periodo: { de: string; ate: string };
  funis: { id: string; nome: string }[];
  membros: { usuario_id: string; nome: string }[];
};

const FUSO = "America/Sao_Paulo";
const PRESETS = [
  { chave: "30d", rotulo: "Últimos 30 dias", dias: 30 },
  { chave: "3m", rotulo: "Últimos 3 meses", dias: 91 },
  { chave: "6m", rotulo: "Últimos 6 meses", dias: 182 },
  { chave: "12m", rotulo: "Últimos 12 meses", dias: 365 },
  { chave: "ano", rotulo: "Este ano", dias: 0 },
  { chave: "custom", rotulo: "Personalizado", dias: 0 },
] as const;

const ROTULO_TIPO: Record<string, string> = {
  telefone: "Ligações",
  ligacao: "Ligações",
  email: "E-mails",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  reuniao: "Reuniões",
  tarefa: "Tarefas",
};
const ROTULO_META: Record<string, string> = {
  valor_ganho: "Valor ganho",
  negocios_ganhos: "Negócios ganhos",
  negocios_criados: "Negócios criados",
  atividades_concluidas: "Atividades concluídas",
};

const GRADE = "#e9e7e1";
const EIXO = "#8a8a92";
const COBALTO = "#2442e5";
const VERDE = "#15803d";
const VERMELHO = "#dc2626";
const CINZA = "#c9c6bd";
const estiloTooltip = {
  cursor: { fill: "rgba(17,17,20,0.04)" },
  contentStyle: { background: "#ffffff", border: "1px solid #dedbd3", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "#111114", fontWeight: 500 },
};

function diaBr(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}
function rotuloMes(m: string): string {
  if (m === "vencidas") return "Vencidas";
  const [a, mm] = m.split("-").map(Number);
  const t = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(a, mm - 1, 15))).replace(".", "");
  return `${t.charAt(0).toUpperCase() + t.slice(1)}/${String(a).slice(2)}`;
}
function etapaLegivel(nome: string): string {
  return nome.charAt(0) + nome.slice(1).toLowerCase();
}
const moedaCurta = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".", ",")} mi` : v >= 1000 ? `${Math.round(v / 1000)} mil` : `${Math.round(v)}`;

function intervalo(preset: string, de: string, ate: string): { de: string; ate: string } {
  const agora = Date.now();
  const hoje = diaBr(agora);
  if (preset === "custom") return { de: de || diaBr(agora - 30 * 86_400_000), ate: ate || hoje };
  if (preset === "ano") return { de: `${hoje.slice(0, 4)}-01-01`, ate: hoje };
  const p = PRESETS.find((x) => x.chave === preset) ?? PRESETS[2];
  return { de: diaBr(agora - p.dias * 86_400_000), ate: hoje };
}

export default function PaginaRelatorios() {
  const [preset, setPreset] = useState<string>("6m");
  const [deCustom, setDeCustom] = useState("");
  const [ateCustom, setAteCustom] = useState("");
  const [funil, setFunil] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [admin, setAdmin] = useState(false);
  const [novaMeta, setNovaMeta] = useState(false);

  const periodo = useMemo(() => intervalo(preset, deCustom, ateCustom), [preset, deCustom, ateCustom]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const q = new URLSearchParams({ de: periodo.de, ate: periodo.ate });
      if (funil) q.set("funil", funil);
      if (responsavel) q.set("responsavel", responsavel);
      const res = await fetch(`/api/crm/relatorios?${q}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível carregar os relatórios.");
      setDados(d);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os relatórios.");
    } finally {
      setCarregando(false);
    }
  }, [periodo, funil, responsavel]);

  useEffect(() => {
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAdmin(d?.papel === "admin"))
      .catch(() => {});
  }, []);

  async function removerMeta(id: string) {
    if (!window.confirm("Remover esta meta?")) return;
    const res = await fetch(`/api/crm/metas?id=${id}`, { method: "DELETE" });
    if (res.ok) void carregar();
  }

  function exportar() {
    if (!dados) return;
    const linhas: (string | number | null)[][] = [
      ["Relatório do CRM", `${periodo.de} a ${periodo.ate}`],
      [],
      ["Resumo"],
      ["Negócios criados", dados.resumo.criados],
      ["Ganhos", dados.resumo.ganhos],
      ["Perdidos", dados.resumo.perdidos],
      ["Valor ganho", dados.resumo.valorGanho],
      ["Taxa de ganho (%)", dados.resumo.taxaGanho],
      ["Ticket médio", dados.resumo.ticketMedio],
      ["Ciclo médio (dias)", dados.resumo.cicloMedioDias],
      [],
      ["Por mês", "Criados", "Ganhos", "Perdidos", "Valor ganho"],
      ...dados.porMes.map((m) => [m.mes, m.criados, m.ganhos, m.perdidos, m.valorGanho]),
      [],
      ["Por pessoa", "Criados", "Ganhos", "Perdidos", "Valor ganho", "Taxa de ganho (%)", "Abertos", "Valor aberto", "Atividades concluídas"],
      ...dados.porPessoa.map((p) => [p.nome, p.criados, p.ganhos, p.perdidos, p.valorGanho, p.taxaGanho, p.abertos, p.valorAberto, p.atividades]),
      [],
      ["Tempo nas etapas", "Média (dias)", "Mediana (dias)", "Negócios que passaram", "Negócios agora"],
      ...dados.tempoEtapas.map((t) => [etapaLegivel(t.nome), t.mediaDias, t.medianaDias, t.amostras, t.agora]),
      [],
      ["Previsão por mês", "Negócios", "Valor", "Ponderado"],
      ...dados.previsao.map((p) => [p.mes, p.negocios, p.valor, Math.round(p.ponderado)]),
    ];
    const csv = linhas.map((l) => l.map((v) => (v === null || v === undefined ? "" : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-crm-${periodo.de}-a-${periodo.ate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const r = dados?.resumo;
  const tiposAtividade = useMemo(() => Object.keys(dados?.atividades.porTipo ?? {}).sort(), [dados]);
  const maxEtapa = Math.max(1, ...(dados?.tempoEtapas ?? []).map((t) => Math.max(t.mediaDias ?? 0, t.agoraMediaDias ?? 0)));
  const maxMotivo = Math.max(1, ...(dados?.motivosPerda ?? []).map((m) => m.total));

  return (
    <MolduraCrm titulo="Relatórios" largura="max-w-[1400px]" acoes={<BotaoSecundario onClick={exportar} disabled={!dados}>Exportar</BotaoSecundario>}>
      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select aria-label="Período" value={preset} onChange={(e) => setPreset(e.target.value)} className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink">
          {PRESETS.map((p) => (
            <option key={p.chave} value={p.chave}>
              {p.rotulo}
            </option>
          ))}
        </select>
        {preset === "custom" && (
          <>
            <input type="date" aria-label="De" value={deCustom || periodo.de} onChange={(e) => setDeCustom(e.target.value)} className="rounded-full border border-pipe-border bg-white px-3 py-1.5 text-sm" />
            <span className="text-pipe-muted">a</span>
            <input type="date" aria-label="Até" value={ateCustom || periodo.ate} onChange={(e) => setAteCustom(e.target.value)} className="rounded-full border border-pipe-border bg-white px-3 py-1.5 text-sm" />
          </>
        )}
        {(dados?.funis.length ?? 0) > 1 && (
          <select aria-label="Funil" value={funil} onChange={(e) => setFunil(e.target.value)} className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink">
            <option value="">Todos os funis</option>
            {dados?.funis.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        )}
        <select aria-label="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink">
          <option value="">Toda a equipe</option>
          {dados?.membros.map((m) => (
            <option key={m.usuario_id} value={m.usuario_id}>
              {m.nome}
            </option>
          ))}
          <option value="sem">Sem responsável</option>
        </select>
        {carregando && <span className="text-sm text-pipe-muted">Atualizando…</span>}
      </div>

      {erro && (
        <div className="mb-4">
          <Aviso>{erro}</Aviso>
        </div>
      )}

      {dados && r && (
        <div className="space-y-6">
          {/* Metas */}
          <Secao
            titulo="Metas"
            descricao="Progresso no mês ou trimestre atual. A marca cinza mostra onde deveria estar pelo tempo que já passou."
            acao={admin ? <BotaoSecundario onClick={() => setNovaMeta(true)} className="shrink-0 whitespace-nowrap !py-1.5">+ Meta</BotaoSecundario> : undefined}
          >
            {dados.metas.length === 0 ? (
              <p className="text-sm text-pipe-muted">{admin ? "Nenhuma meta ainda. Crie metas de valor ganho, negócios ou atividades para a equipe ou por pessoa." : "Nenhuma meta definida pelo administrador."}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {dados.metas.map((m) => {
                  const pct = Math.min(100, m.percentual);
                  const atrasada = m.percentual < m.esperado;
                  return (
                    <div key={m.id} className="rounded-xl border border-pipe-border bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-pipe-muted">
                            {m.nome} · {m.periodo_rotulo}
                          </p>
                          <p className="mt-0.5 font-medium text-pipe-ink">{ROTULO_META[m.tipo]}</p>
                        </div>
                        {admin && (
                          <button onClick={() => void removerMeta(m.id)} aria-label="Remover meta" className="h-7 w-7 rounded-full text-pipe-muted hover:bg-pipe-dark hover:text-pipe-ink">
                            ×
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-2xl font-medium tabular-nums tracking-tight text-pipe-ink">
                        {m.tipo === "valor_ganho" ? formatarMoeda(m.atual) : m.atual}
                        <span className="text-sm font-normal text-pipe-muted"> / {m.tipo === "valor_ganho" ? formatarMoeda(m.alvo) : m.alvo}</span>
                      </p>
                      <div className="relative mt-3 h-2 rounded-full bg-pipe-dark" role="progressbar" aria-valuenow={m.percentual} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.percentual}% da meta`}>
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: m.percentual >= 100 ? VERDE : atrasada ? "#d97706" : COBALTO }} />
                        <div className="absolute -top-1 h-4 w-0.5 bg-pipe-ink/30" style={{ left: `${m.esperado}%` }} aria-hidden="true" />
                      </div>
                      <p className="mt-2 text-xs text-pipe-muted">
                        {m.percentual}% {m.percentual >= 100 ? "· meta batida" : atrasada ? `· abaixo do ritmo (${m.esperado}% do período passou)` : "· no ritmo"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Secao>

          {/* Indicadores */}
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-pipe-border bg-pipe-card md:grid-cols-4 xl:grid-cols-7">
            {[
              { r: "Valor ganho", v: formatarMoeda(r.valorGanho), d: `${r.ganhos} negócio${r.ganhos === 1 ? "" : "s"}` },
              { r: "Taxa de ganho", v: r.taxaGanho === null ? "—" : `${r.taxaGanho}%`, d: `${r.ganhos} ganhos · ${r.perdidos} perdidos` },
              { r: "Ticket médio", v: r.ticketMedio === null ? "—" : formatarMoeda(r.ticketMedio), d: "por negócio ganho" },
              { r: "Ciclo de venda", v: r.cicloMedioDias === null ? "—" : `${r.cicloMedioDias} dias`, d: "da criação ao ganho" },
              { r: "Negócios criados", v: String(r.criados), d: "no período" },
              { r: "Em aberto", v: formatarMoeda(r.valorAberto), d: `${r.abertos} negócio${r.abertos === 1 ? "" : "s"}` },
              { r: "Parados", v: String(r.parados), d: "há 14 dias ou mais" },
            ].map((k) => (
              <div key={k.r} className="border-b border-r border-pipe-border p-4 last:border-r-0">
                <dt className="text-xs text-pipe-muted">{k.r}</dt>
                <dd className="mt-1 text-xl font-medium tabular-nums tracking-tight text-pipe-ink">{k.v}</dd>
                <dd className="mt-0.5 text-xs text-pipe-muted">{k.d}</dd>
              </div>
            ))}
          </dl>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Secao titulo="Negócios por mês" descricao="Criados no mês e fechados (ganhos ou perdidos) no mês.">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados.porMes.map((m) => ({ ...m, rotulo: rotuloMes(m.mes) }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRADE} />
                    <XAxis dataKey="rotulo" stroke={EIXO} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={EIXO} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...estiloTooltip} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#4b4b53" }} />
                    <Bar dataKey="criados" name="Criados" fill={CINZA} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="ganhos" name="Ganhos" fill={VERDE} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="perdidos" name="Perdidos" fill={VERMELHO} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Secao>
            <Secao titulo="Valor ganho por mês">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados.porMes.map((m) => ({ ...m, rotulo: rotuloMes(m.mes) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRADE} />
                    <XAxis dataKey="rotulo" stroke={EIXO} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={EIXO} fontSize={11} tickLine={false} axisLine={false} tickFormatter={moedaCurta} width={52} />
                    <Tooltip {...estiloTooltip} formatter={(v) => formatarMoeda(Number(v))} />
                    <Bar dataKey="valorGanho" name="Valor ganho" fill={COBALTO} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Secao>
          </div>

          <Secao titulo="Desempenho por pessoa">
            <Tabela
              cabecalho={["Pessoa", "Criados", "Ganhos", "Perdidos", "Taxa de ganho", "Valor ganho", "Em aberto", "Atividades feitas"]}
              linhas={dados.porPessoa.map((p) => [
                p.nome,
                p.criados,
                p.ganhos,
                p.perdidos,
                p.taxaGanho === null ? "—" : `${p.taxaGanho}%`,
                formatarMoeda(p.valorGanho),
                `${p.abertos} · ${formatarMoeda(p.valorAberto)}`,
                p.atividades,
              ])}
            />
          </Secao>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Secao titulo="Tempo em cada etapa" descricao="Média de dias que os negócios ficaram na etapa antes de sair dela no período, e há quanto tempo estão os que estão lá agora.">
              {dados.tempoEtapas.every((t) => t.amostras === 0 && t.agora === 0) ? (
                <p className="text-sm text-pipe-muted">Ainda não há movimentações suficientes neste período.</p>
              ) : (
                <ul className="space-y-3">
                  {dados.tempoEtapas.map((t) => (
                    <li key={t.stage_id}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="text-pipe-ink">{etapaLegivel(t.nome)}</span>
                        <span className="tabular-nums text-pipe-muted">
                          {t.mediaDias === null ? "—" : `${t.mediaDias} d em média`}
                          {t.agora > 0 && ` · ${t.agora} lá agora (${t.agoraMediaDias} d)`}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-pipe-dark">
                        {t.agoraMediaDias !== null && <div className="absolute h-2 rounded-full bg-[#c9c6bd]" style={{ width: `${(t.agoraMediaDias / maxEtapa) * 100}%` }} />}
                        {t.mediaDias !== null && <div className="absolute h-2 rounded-full" style={{ width: `${(t.mediaDias / maxEtapa) * 100}%`, background: COBALTO }} />}
                      </div>
                    </li>
                  ))}
                  <li className="flex gap-4 pt-1 text-xs text-pipe-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: COBALTO }} /> média de quem saiu
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#c9c6bd]" /> quem está lá agora
                    </span>
                  </li>
                </ul>
              )}
            </Secao>
            <Secao titulo="Negócios parados" descricao="Abertos e sem nenhuma movimentação há 14 dias ou mais.">
              {dados.parados.length === 0 ? (
                <p className="text-sm text-pipe-muted">Nenhum negócio parado. Bom sinal.</p>
              ) : (
                <ul className="divide-y divide-pipe-border/70">
                  {dados.parados.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <Link href={`/crm?empresa=${p.company_id}`} className="block truncate font-medium text-pipe-ink hover:text-pipe-blue">
                          {p.titulo}
                        </Link>
                        <p className="truncate text-xs text-pipe-muted">
                          {etapaLegivel(p.etapa)} · {p.responsavel}
                          {p.valor ? ` · ${formatarMoeda(p.valor)}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium tabular-nums text-amber-800">{p.dias} dias</span>
                    </li>
                  ))}
                </ul>
              )}
              {r.parados > dados.parados.length && <p className="mt-2 text-xs text-pipe-muted">Mostrando os {dados.parados.length} mais antigos de {r.parados}.</p>}
            </Secao>
          </div>

          <Secao titulo="Atividades" descricao="Atividades concluídas no período por quem concluiu.">
            <div className="mb-4 flex flex-wrap gap-2 text-sm">
              <Selo>{dados.atividades.concluidas} concluídas</Selo>
              <Selo>{dados.atividades.percentualNoPrazo === null ? "—" : `${dados.atividades.percentualNoPrazo}%`} no prazo</Selo>
              <Selo alerta={dados.atividades.atrasadasAbertas > 0}>{dados.atividades.atrasadasAbertas} atrasadas em aberto</Selo>
            </div>
            {dados.atividades.porPessoa.length === 0 ? (
              <p className="text-sm text-pipe-muted">Nenhuma atividade concluída neste período.</p>
            ) : (
              <Tabela
                cabecalho={["Pessoa", ...tiposAtividade.map((t) => ROTULO_TIPO[t] ?? t), "Total", "No prazo"]}
                linhas={dados.atividades.porPessoa.map((p) => [
                  p.nome,
                  ...tiposAtividade.map((t) => p.porTipo[t] ?? 0),
                  p.total,
                  p.total ? `${Math.round((p.noPrazo / p.total) * 100)}%` : "—",
                ])}
              />
            )}
          </Secao>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Secao titulo="Previsão de fechamento" descricao="Negócios abertos pela data prevista de fechamento. Ponderado = valor × chance da etapa.">
              {dados.previsao.length === 0 ? (
                <p className="text-sm text-pipe-muted">Nenhum negócio aberto com data prevista. Preencha a previsão de fechamento nos negócios para ver este gráfico.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados.previsao.map((p) => ({ ...p, rotulo: rotuloMes(p.mes) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRADE} />
                      <XAxis dataKey="rotulo" stroke={EIXO} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={EIXO} fontSize={11} tickLine={false} axisLine={false} tickFormatter={moedaCurta} width={52} />
                      <Tooltip {...estiloTooltip} formatter={(v) => formatarMoeda(Number(v))} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#4b4b53" }} />
                      <Bar dataKey="valor" name="Valor total" fill={CINZA} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="ponderado" name="Ponderado" fill={COBALTO} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {dados.semData.negocios > 0 && (
                <p className="mt-2 text-xs text-pipe-muted">
                  {dados.semData.negocios} negócio(s) aberto(s) sem data prevista ({formatarMoeda(dados.semData.valor)}).
                </p>
              )}
            </Secao>
            <Secao titulo="Por que perdemos" descricao="Motivos informados nos negócios perdidos no período.">
              {dados.motivosPerda.length === 0 ? (
                <p className="text-sm text-pipe-muted">Nenhum negócio perdido neste período.</p>
              ) : (
                <ul className="space-y-3">
                  {dados.motivosPerda.map((m) => (
                    <li key={m.motivo}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-pipe-ink">{m.motivo}</span>
                        <span className="tabular-nums text-pipe-muted">{m.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-pipe-dark">
                        <div className="h-2 rounded-full" style={{ width: `${(m.total / maxMotivo) * 100}%`, background: VERMELHO }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Secao>
          </div>
        </div>
      )}

      {novaMeta && dados && (
        <JanelaMeta
          membros={dados.membros}
          funis={dados.funis}
          aoFechar={() => setNovaMeta(false)}
          aoSalvar={() => {
            setNovaMeta(false);
            void carregar();
          }}
        />
      )}
    </MolduraCrm>
  );
}

function Secao({ titulo, descricao, acao, children }: { titulo: string; descricao?: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-pipe-border bg-pipe-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-pipe-ink">{titulo}</h2>
          {descricao && <p className="mt-0.5 max-w-2xl text-xs text-pipe-muted">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Selo({ children, alerta = false }: { children: React.ReactNode; alerta?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1.5 ${alerta ? "border-red-600/30 bg-red-50 text-red-700" : "border-pipe-border text-pipe-ink-soft"}`}>{children}</span>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-pipe-border text-left text-xs text-pipe-muted">
            {cabecalho.map((c, i) => (
              <th key={c} className={`whitespace-nowrap py-2 pr-3 font-medium ${i ? "text-right" : ""}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b border-pipe-border/60 last:border-0">
              {l.map((v, j) => (
                <td key={j} className={`py-2.5 pr-3 ${j ? "text-right tabular-nums text-pipe-ink-soft" : "font-medium text-pipe-ink"}`}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JanelaMeta({
  membros,
  funis,
  aoFechar,
  aoSalvar,
}: {
  membros: { usuario_id: string; nome: string }[];
  funis: { id: string; nome: string }[];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [f, setF] = useState({ tipo: "valor_ganho", periodo: "mes", usuario_id: "", pipeline_id: "", alvo: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/crm/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, alvo: Number(f.alvo.replace(/\./g, "").replace(",", ".")) }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível salvar a meta.");
      aoSalvar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a meta.");
    } finally {
      setSalvando(false);
    }
  }
  return (
    <Janela aberta titulo="Nova meta" aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Rotulo htmlFor="m-tipo">O que medir</Rotulo>
            <select id="m-tipo" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={classeCampo}>
              {Object.entries(ROTULO_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Rotulo htmlFor="m-alvo">{f.tipo === "valor_ganho" ? "Alvo (R$)" : "Alvo (quantidade)"}</Rotulo>
            <input id="m-alvo" inputMode="decimal" required value={f.alvo} onChange={(e) => setF({ ...f, alvo: e.target.value })} className={classeCampo} />
          </div>
          <div>
            <Rotulo htmlFor="m-periodo">Período</Rotulo>
            <select id="m-periodo" value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} className={classeCampo}>
              <option value="mes">Por mês</option>
              <option value="trimestre">Por trimestre</option>
            </select>
          </div>
          <div>
            <Rotulo htmlFor="m-pessoa">De quem</Rotulo>
            <select id="m-pessoa" value={f.usuario_id} onChange={(e) => setF({ ...f, usuario_id: e.target.value })} className={classeCampo}>
              <option value="">Equipe inteira</option>
              {membros.map((m) => (
                <option key={m.usuario_id} value={m.usuario_id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          {funis.length > 1 && (
            <div>
              <Rotulo htmlFor="m-funil">Funil</Rotulo>
              <select id="m-funil" value={f.pipeline_id} onChange={(e) => setF({ ...f, pipeline_id: e.target.value })} className={classeCampo}>
                <option value="">Todos</option>
                {funis.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Criar meta"}
          </BotaoPrimario>
        </div>
      </form>
    </Janela>
  );
}
