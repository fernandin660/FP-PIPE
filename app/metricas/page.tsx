"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";

import Sidebar from "../../components/Sidebar";
import { criarClienteSupabase } from "../../lib/supabase/client";
import type { PerfilVendedor } from "../../components/ModalPerfil";

type Resumo = {
  empresas: number;
  contatos: number;
  listas: number;
  leadsPipeline: number;
  oportunidadesAbertas: number;
  ganhos: number;
  perdidos: number;
  winRate: number;
  valorPipeline: number;
  valorAberto: number;
  empresasPeriodo: number;
  contatosPeriodo: number;
  listasPeriodo: number;
  adicionadosPeriodo: number;
};

type FunilItem = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  atual: number;
  valorAtual: number;
  aderidosPeriodo: number;
  totDias: number;
};

type PontoSerie = {
  rotulo: string;
  adicionados: number;
  empresas: number;
};

type Produto = {
  produto: string;
  total: number;
  valor: number;
  ganhos: number;
  perdidos: number;
};

type AtividadeVendedor = {
  usuario_id: string;
  nome: string | null;
  email: string | null;
  atividades: number;
  emails: number;
  telefones: number;
  reunioes: number;
  cadencias: number;
  observacoes: number;
  empresas: number;
  contatos: number;
  leads: number;
};

type Geracao = {
  empresasPorOrigem: Array<{ origem: string; total: number }>;
};

type AtividadePendente = {
  id: string;
  tipo_evento: string;
  tipo_atividade: string;
  titulo: string;
  observacao: string;
  data_hora_atividade: string | null;
  concluida: boolean;
  atrasada: boolean;
  company_id: string;
  empresa: string;
  stage_nome: string | null;
  responsavel_nome: string | null;
  autor_nome: string | null;
  criado_em: string;
};

type PayloadMetricas = {
  resumo: Resumo;
  funil: FunilItem[];
  serie: PontoSerie[];
  produtos: Produto[];
  atividade: AtividadeVendedor[];
  geracao: Geracao;
};

const PERIODOS = [
  { valor: "30", rotulo: "30 dias" },
  { valor: "60", rotulo: "60 dias" },
  { valor: "90", rotulo: "90 dias" },
];

const brl = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
        n
      );

const num = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

const TIPO_ROTULO: Record<string, string> = {
  email: "E-mail",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  observacao: "Observação",
};

const fmtData = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const paraInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
};

function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarCsv(dados: PayloadMetricas) {
  const linhas: string[][] = [];
  linhas.push(["Relatório FP PIPE+", ""]);
  linhas.push(["Gerado em", new Date().toLocaleString("pt-BR")]);
  linhas.push([]);
  linhas.push(["RESUMO", ""]);
  linhas.push(["Indicador", "Valor"]);
  linhas.push(["Leads no pipeline", String(dados.resumo.leadsPipeline)]);
  linhas.push(["Oportunidades abertas", String(dados.resumo.oportunidadesAbertas)]);
  linhas.push(["Ganhos", String(dados.resumo.ganhos)]);
  linhas.push(["Perdidos", String(dados.resumo.perdidos)]);
  linhas.push(["Win rate (%)", dados.resumo.winRate.toFixed(1)]);
  linhas.push(["Valor de pipeline (R$)", brl(dados.resumo.valorPipeline)]);
  linhas.push([]);
  linhas.push(["FUNIL", ""]);
  linhas.push(["Estágio", "Atuais", "Aderidos (período)", "Tempo médio (dias)", "Valor (R$)"]);
  for (const f of dados.funil) {
    linhas.push([
      f.nome,
      String(f.atual),
      String(f.aderidosPeriodo),
      f.totDias.toFixed(1),
      brl(f.valorAtual),
    ]);
  }
  linhas.push([]);
  linhas.push(["PRODUTOS", ""]);
  linhas.push(["Produto", "Total", "Ganhos", "Perdidos", "Valor (R$)"]);
  for (const p of dados.produtos) {
    linhas.push([p.produto, String(p.total), String(p.ganhos), String(p.perdidos), brl(p.valor)]);
  }
  linhas.push([]);
  linhas.push(["ATIVIDADE DOS VENDEDORES", ""]);
  linhas.push([
    "Vendedor",
    "Atividades",
    "E-mails",
    "Telefones",
    "Reuniões",
    "Cadências",
    "Empresas",
    "Contatos",
    "Leads",
  ]);
  for (const v of dados.atividade) {
    linhas.push([
      v.nome || v.email || v.usuario_id,
      String(v.atividades),
      String(v.emails),
      String(v.telefones),
      String(v.reunioes),
      String(v.cadencias),
      String(v.empresas),
      String(v.contatos),
      String(v.leads),
    ]);
  }

  const conteudo =
    "\uFEFF" +
    linhas.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  baixarArquivo("relatorio-fp-pipe.csv", conteudo, "text/csv;charset=utf-8;");
}

async function exportarPdf(dados: PayloadMetricas) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 40;

  const cabecalho = () => {
    doc.setFillColor(3, 6, 9);
    doc.rect(0, 0, W, 74, "F");
    doc.setFillColor(162, 255, 64);
    doc.rect(MARGIN, 44, 10, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("FP PIPE+", MARGIN + 18, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text("Dashboard de prospecção B2B", MARGIN, 68);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, W - MARGIN, 52, {
      align: "right",
    });
    doc.setDrawColor(162, 255, 64);
    doc.setLineWidth(2);
    doc.line(MARGIN, 74, W - MARGIN, 74);
  };

  cabecalho();

  let y = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(3, 6, 9);
  doc.text("Resumo", MARGIN, y);
  y += 14;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Indicador", "Valor"]],
    body: [
      ["Leads no pipeline", String(dados.resumo.leadsPipeline)],
      ["Oportunidades abertas", String(dados.resumo.oportunidadesAbertas)],
      ["Ganhos", String(dados.resumo.ganhos)],
      ["Perdidos", String(dados.resumo.perdidos)],
      ["Win rate", `${dados.resumo.winRate.toFixed(1)}%`],
      ["Valor de pipeline", brl(dados.resumo.valorPipeline)],
      ["Novos leads (período)", String(dados.resumo.adicionadosPeriodo)],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [3, 6, 9], textColor: 255 },
  });
  y =
      (((doc as unknown as { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY ?? y) + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(3, 6, 9);
  doc.text("Funil / Pipeline", MARGIN, y);
  y += 14;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Estágio", "Atuais", "Aderidos (período)", "Tempo médio (dias)", "Valor"]],
    body: dados.funil.map((f) => [
      f.nome,
      String(f.atual),
      String(f.aderidosPeriodo),
      f.totDias.toFixed(1),
      brl(f.valorAtual),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [3, 6, 9], textColor: 255 },
  });
  y =
      (((doc as unknown as { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY ?? y) + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(3, 6, 9);
  doc.text("Resultado por produto", MARGIN, y);
  y += 14;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Produto", "Total", "Ganhos", "Perdidos", "Valor"]],
    body: dados.produtos.map((p) => [
      p.produto,
      String(p.total),
      String(p.ganhos),
      String(p.perdidos),
      brl(p.valor),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [3, 6, 9], textColor: 255 },
  });
  y =
      (((doc as unknown as { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY ?? y) + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(3, 6, 9);
  doc.text("Atividade dos vendedores", MARGIN, y);
  y += 14;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Vendedor", "Atividades", "E-mails", "Telefones", "Reuniões", "Cadências", "Leads"]],
    body: dados.atividade.map((v) => [
      v.nome || v.email || v.usuario_id,
      String(v.atividades),
      String(v.emails),
      String(v.telefones),
      String(v.reunioes),
      String(v.cadencias),
      String(v.leads),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [3, 6, 9], textColor: 255 },
  });

  doc.save("relatorio-fp-pipe.pdf");
}

const CARTESIAN_MARGIN = { top: 5, right: 5, bottom: 0, left: -20 };

function PaginaMetricas() {
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  const [periodo, setPeriodo] = useState("30");
  const [dados, setDados] = useState<PayloadMetricas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [pendentes, setPendentes] = useState<AtividadePendente[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(true);
  const [erroPendentes, setErroPendentes] = useState("");
  const [editando, setEditando] = useState<AtividadePendente | null>(null);
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");

  const carregar = useCallback(async (dias: string) => {
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch(`/api/metricas?dias=${dias}`);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.erro ?? "Falha ao carregar métricas.");
      }
      const json = await res.json();
      setDados(json as PayloadMetricas);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar métricas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(periodo);
  }, [periodo, carregar]);

  useEffect(() => {
    const supabase = criarClienteSupabase();
    if (!supabase) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const { data } = await supabase
          .from("perfil")
          .select("*")
          .eq("usuario_id", user.id)
          .maybeSingle();
        setPerfil((data as PerfilVendedor) ?? null);
      }
      const { data: creds } = await supabase
        .from("creditos")
        .select("saldo")
        .eq("usuario_id", user?.id ?? "")
        .maybeSingle();
      setSaldoCreditos(creds?.saldo ?? null);
    })();
  }, []);

  const carregarPendentes = useCallback(
    async (de?: string, ate?: string) => {
      setCarregandoPendentes(true);
      setErroPendentes("");
      try {
        const params = new URLSearchParams();
        if (de) params.set("de", de);
        if (ate) params.set("ate", ate);
        const query = params.toString();
        const res = await fetch(`/api/crm/atividades${query ? `?${query}` : ""}`);
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          throw new Error(d?.erro ?? "Falha ao carregar atividades pendentes.");
        }
        const json = await res.json();
        setPendentes((json.pendentes ?? []) as AtividadePendente[]);
      } catch (e) {
        setErroPendentes(
          e instanceof Error ? e.message : "Falha ao carregar atividades pendentes."
        );
      } finally {
        setCarregandoPendentes(false);
      }
    },
    []
  );

  useEffect(() => {
    void carregarPendentes(filtroDe || undefined, filtroAte || undefined);
  }, [filtroDe, filtroAte, carregarPendentes]);

  const alternarConcluida = async (a: AtividadePendente) => {
    const res = await fetch("/api/crm/atividades", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atividade_id: a.id, concluida: !a.concluida }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setErroPendentes(d?.erro ?? "Não foi possível concluir a atividade.");
      return;
    }
    await Promise.all([
      carregarPendentes(filtroDe || undefined, filtroAte || undefined),
      carregar(periodo),
    ]);
  };

  const salvarEdicao = async (titulo: string, observacao: string, dataHora: string) => {
    if (!editando) return;
    const res = await fetch("/api/crm/atividades", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        atividade_id: editando.id,
        titulo,
        observacao,
        data_hora_atividade: dataHora,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      throw new Error(d?.erro ?? "Não foi possível salvar a atividade.");
    }
    setEditando(null);
    await Promise.all([
      carregarPendentes(filtroDe || undefined, filtroAte || undefined),
      carregar(periodo),
    ]);
  };

  const exportar = useMemo(() => {
    return {
      csv: () => dados && exportarCsv(dados),
      pdf: () => {
        if (dados) void exportarPdf(dados);
      },
    };
  }, [dados]);

  const cards = dados
    ? [
        { rotulo: "Leads no pipeline", valor: num(dados.resumo.leadsPipeline), cor: "text-pipe-blue" },
        {
          rotulo: "Oportunidades abertas",
          valor: num(dados.resumo.oportunidadesAbertas),
          cor: "text-pipe-lime",
        },
        { rotulo: "Win rate", valor: `${dados.resumo.winRate.toFixed(1)}%`, cor: "text-pipe-lime" },
        {
          rotulo: "Valor de pipeline",
          valor: brl(dados.resumo.valorPipeline),
          cor: "text-white",
        },
        {
          rotulo: "Novos leads (período)",
          valor: num(dados.resumo.adicionadosPeriodo),
          cor: "text-pipe-blue",
        },
      ]
    : [];

  const maxOrdem = useMemo(
    () => (dados ? Math.max(...dados.funil.map((f) => f.atual), 1) : 1),
    [dados]
  );

  return (
    <>
      <Sidebar
        perfil={perfil}
        saldoCreditos={saldoCreditos}
        aoAbrirPerfil={() => setModalPerfilAberto(true)}
      />
      <main className="min-h-screen bg-pipe-dark px-6 py-8 lg:pl-72">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-5">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl text-white flex items-center gap-2">
                📊 Dashboard
              </h1>
              <p className="text-sm text-pipe-muted mt-0.5">
                Indicadores de prospecção, conversão e resultado · FP PIPE+
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dados && (
                <>
                  <button
                    onClick={exportar.csv}
                    className="bg-pipe-card border border-pipe-border text-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-pipe-lime/50 transition"
                  >
                    ⬇ CSV
                  </button>
                  <button
                    onClick={exportar.pdf}
                    className="bg-pipe-lime text-pipe-bg font-bold px-4 py-2.5 rounded-xl text-sm hover:brightness-110 transition"
                  >
                    ⬇ PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Período */}
          <div className="bg-pipe-card border border-pipe-border rounded-2xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-pipe-muted font-semibold">
              Período:
            </span>
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  periodo === p.valor
                    ? "bg-pipe-lime/15 text-pipe-lime border border-pipe-lime/30"
                    : "text-gray-300 hover:bg-pipe-bg border border-transparent"
                }`}
              >
                {p.rotulo}
              </button>
            ))}
          </div>

          {erro && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              {erro}
            </p>
          )}

          {carregando && !dados ? (
            <p className="text-sm text-pipe-muted">Carregando métricas…</p>
          ) : dados ? (
            <>
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {cards.map((c) => (
                  <div
                    key={c.rotulo}
                    className="bg-pipe-card border border-pipe-border rounded-2xl p-4"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-pipe-muted">
                      {c.rotulo}
                    </p>
                    <p className={`text-2xl font-display font-bold mt-1 ${c.cor}`}>
                      {c.valor}
                    </p>
                  </div>
                ))}
              </div>

              {/* Atividades pendentes / a fazer */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="font-display text-lg text-white">
                    Atividades pendentes
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-pipe-muted">
                      De
                      <input
                        type="date"
                        value={filtroDe}
                        onChange={(e) => setFiltroDe(e.target.value)}
                        className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-pipe-muted">
                      Até
                      <input
                        type="date"
                        value={filtroAte}
                        onChange={(e) => setFiltroAte(e.target.value)}
                        className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-1 text-xs text-white"
                      />
                    </label>
                    {(filtroDe || filtroAte) && (
                      <button
                        onClick={() => {
                          setFiltroDe("");
                          setFiltroAte("");
                        }}
                        className="text-xs text-pipe-muted hover:text-pipe-lime transition"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-pipe-muted">
                    {num(pendentes.length)} a fazer
                  </span>
                </div>

                {erroPendentes && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
                    {erroPendentes}
                  </p>
                )}

                {carregandoPendentes ? (
                  <p className="text-sm text-pipe-muted">
                    Carregando atividades…
                  </p>
                ) : pendentes.length === 0 ? (
                  <p className="text-sm text-pipe-muted">
                    Nenhuma atividade pendente. Aplicar uma cadência a um lead
                    cria os próximos passos aqui.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendentes.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-start justify-between gap-3 bg-pipe-bg border border-pipe-border rounded-xl p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {a.titulo}
                          </p>
                          <p className="text-xs text-pipe-muted truncate mt-0.5">
                            {a.empresa}
                            {a.stage_nome ? ` · ${a.stage_nome}` : ""}
                            {a.responsavel_nome
                              ? ` · ${a.responsavel_nome}`
                              : ""}
                          </p>
                          <p className="text-[11px] text-pipe-muted mt-1 flex flex-wrap items-center gap-x-2">
                            <span>
                              {TIPO_ROTULO[a.tipo_atividade] ?? a.tipo_atividade}
                            </span>
                            <span>·</span>
                            <span
                              className={
                                a.atrasada
                                  ? "text-red-400 font-semibold"
                                  : ""
                              }
                            >
                              {a.data_hora_atividade
                                ? fmtData(a.data_hora_atividade)
                                : "Sem data"}
                              {a.atrasada ? " · Atrasada" : ""}
                            </span>
                          </p>
                          {a.observacao && (
                            <p className="text-xs text-pipe-muted/70 mt-1 line-clamp-2">
                              {a.observacao}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Link
                            href="/crm"
                            className="text-xs text-pipe-blue font-semibold px-2.5 py-1.5 border border-pipe-border rounded-lg hover:border-pipe-lime/40 transition"
                          >
                            Ver lead
                          </Link>
                          <button
                            onClick={() => setEditando(a)}
                            className="text-xs text-gray-200 font-semibold px-2.5 py-1.5 border border-pipe-border rounded-lg hover:border-pipe-lime/40 transition"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => void alternarConcluida(a)}
                            className="text-xs bg-pipe-lime text-pipe-bg font-bold px-2.5 py-1.5 rounded-lg hover:brightness-110 transition"
                          >
                            ✓ Concluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Funil de conversão */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="font-display text-lg text-white mb-4">
                  Funil de conversão
                </h2>
                <div className="space-y-3">
                  {dados.funil.map((f) => (
                    <div key={f.id}>
                      <div className="flex flex-wrap items-center justify-between text-xs mb-1 gap-2">
                        <span className="font-semibold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: f.cor }}
                          />
                          {f.nome}
                        </span>
                        <span className="text-pipe-muted">
                          {num(f.atual)} atual{ f.atual === 1 ? "" : "is"} · {num(f.aderidosPeriodo)} aderidos · {f.totDias.toFixed(1)}d médio · {brl(f.valorAtual)}
                        </span>
                      </div>
                      <div className="h-2.5 bg-pipe-bg rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(f.atual / maxOrdem) * 100}%`,
                            background: f.cor,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Série temporal */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="font-display text-lg text-white mb-4">
                  Evolução no período
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados.serie} margin={CARTESIAN_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="rotulo" stroke="#9ca3af" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#0a0f14",
                          border: "1px solid #1f2937",
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Legend />
                      <Bar dataKey="adicionados" name="Leads adicionados" fill="#a2ff40" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="empresas" name="Empresas geradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Resultado por produto */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="font-display text-lg text-white mb-4">
                  Resultado por produto
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dados.produtos.map((p) => (
                    <div
                      key={p.produto}
                      className="bg-pipe-bg border border-pipe-border rounded-xl p-4"
                    >
                      <p className="text-sm font-bold text-white line-clamp-1">
                        {p.produto}
                      </p>
                      <p className="text-lg font-display font-bold text-pipe-lime mt-1">
                        {brl(p.valor)}
                      </p>
                      <p className="text-[11px] text-pipe-muted mt-1">
                        {num(p.total)} lead{p.total === 1 ? "" : "s"} ·{" "}
                        <span className="text-pipe-lime">{p.ganhos} ganhos</span> ·{" "}
                        <span className="text-red-400">{p.perdidos} perdidos</span>
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Atividade por vendedor */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="font-display text-lg text-white mb-4">
                  Atividade dos vendedores
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-pipe-muted border-b border-pipe-border">
                        <th className="py-2 pr-3">Vendedor</th>
                        <th className="py-2 pr-3">Atividades</th>
                        <th className="py-2 pr-3">E-mails</th>
                        <th className="py-2 pr-3">Telefones</th>
                        <th className="py-2 pr-3">Reuniões</th>
                        <th className="py-2 pr-3">Cadências</th>
                        <th className="py-2 pr-3">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.atividade.map((v) => (
                        <tr
                          key={v.usuario_id}
                          className="border-b border-pipe-border/50"
                        >
                          <td className="py-2.5 pr-3 text-white font-medium">
                            {v.nome || v.email || "Membro"}
                          </td>
                          <td className="py-2.5 pr-3 text-pipe-blue font-semibold">
                            {num(v.atividades)}
                          </td>
                          <td className="py-2.5 pr-3">{num(v.emails)}</td>
                          <td className="py-2.5 pr-3">{num(v.telefones)}</td>
                          <td className="py-2.5 pr-3">{num(v.reunioes)}</td>
                          <td className="py-2.5 pr-3">{num(v.cadencias)}</td>
                          <td className="py-2.5 pr-3">{num(v.leads)}</td>
                        </tr>
                      ))}
                      {dados.atividade.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-4 text-sm text-pipe-muted"
                          >
                            Nenhuma atividade registrada neste período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Geração por origem */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="font-display text-lg text-white mb-4">
                  Geração de leads por origem
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dados.geracao.empresasPorOrigem.map((g) => (
                    <div
                      key={g.origem}
                      className="bg-pipe-bg border border-pipe-border rounded-xl p-4"
                    >
                      <p className="text-sm font-bold text-white capitalize">
                        {g.origem.replace(/_/g, " ")}
                      </p>
                      <p className="text-lg font-display font-bold text-pipe-blue mt-1">
                        {num(g.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-pipe-muted text-sm">
                Cadastre leads no CRM para começar a ver métricas aqui.
              </p>
              <Link
                href="/crm"
                className="inline-block mt-3 text-pipe-lime font-semibold text-sm hover:underline"
              >
                → Ir para o CRM
              </Link>
            </div>
          )}
        </div>
      </main>

      {editando && (
        <ModalEdicaoAtividade
          atividade={editando}
          aoSalvar={salvarEdicao}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function ModalEdicaoAtividade({
  atividade,
  aoSalvar,
  aoFechar,
}: {
  atividade: AtividadePendente;
  aoSalvar: (titulo: string, observacao: string, dataHora: string) => Promise<void>;
  aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState(atividade.titulo);
  const [observacao, setObservacao] = useState(atividade.observacao ?? "");
  const [data, setData] = useState(
    atividade.data_hora_atividade
      ? paraInput(atividade.data_hora_atividade)
      : ""
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    try {
      await aoSalvar(
        titulo,
        observacao,
        data ? new Date(data).toISOString() : ""
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const inputCls =
    "w-full bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:border-pipe-lime outline-none mt-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={aoFechar}
    >
      <div
        className="bg-pipe-card border border-pipe-border rounded-2xl p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-white mb-1">Editar atividade</h3>
        <p className="text-xs text-pipe-muted mb-4 truncate">
          {atividade.empresa}
          {atividade.stage_nome ? ` · ${atividade.stage_nome}` : ""}
        </p>

        <label className="block text-xs text-pipe-muted font-semibold">
          Título
        </label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={inputCls}
        />

        <label className="block text-xs text-pipe-muted font-semibold mt-3">
          Observação
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={4}
          className={inputCls}
        />

        <label className="block text-xs text-pipe-muted font-semibold mt-3">
          Data e hora
        </label>
        <input
          type="datetime-local"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={inputCls}
        />

        {erro && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mt-3">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={aoFechar}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 border border-pipe-border hover:border-pipe-lime/40 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-pipe-lime text-pipe-bg hover:brightness-110 disabled:opacity-50 transition"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaginaMetricas;
