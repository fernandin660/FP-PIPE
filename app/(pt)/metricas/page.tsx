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

import Sidebar from "../../../components/Sidebar";
import { criarClienteSupabase } from "../../../lib/supabase/client";
import {
  IconeEscrever,
  IconeGrafico,
  IconeVerificado,
} from "../../../components/Icones";
import type { PerfilVendedor } from "../../../components/ModalPerfil";

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
  valorPonderado?: number;
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
  alcancaram?: number;
  probabilidade?: number;
  valorPonderado?: number;
  perdido?: boolean;
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

type ProdutoCadastro = {
  id: string;
  nome: string;
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
  motivosPerda?: Array<{ motivo: string; total: number }>;
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
  linhas.push(["Relatório FP Pipe", ""]);
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
    doc.text("FP Pipe", MARGIN + 18, 52);
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
  const [filtroProduto, setFiltroProduto] = useState("");
  const [produtosCadastrados, setProdutosCadastrados] = useState<
    ProdutoCadastro[]
  >([]);

  const carregar = useCallback(async (dias: string, produto?: string) => {
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams({ dias });
      if (produto) params.set("produto", produto);
      const res = await fetch(`/api/metricas?${params.toString()}`);
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
    const temporizador = setTimeout(() => {
      void carregar(periodo, filtroProduto);
    }, 0);
    return () => clearTimeout(temporizador);
  }, [periodo, filtroProduto, carregar]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/produtos");
        if (res.ok) {
          const dados = await res.json();
          setProdutosCadastrados(dados.produtos ?? []);
        }
      } catch {
        // Sem produtos cadastrados, o filtro fica apenas em "Todos".
      }
    })();
  }, []);

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
    const temporizador = setTimeout(() => {
      void carregarPendentes(filtroDe || undefined, filtroAte || undefined);
    }, 0);
    return () => clearTimeout(temporizador);
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
      carregar(periodo, filtroProduto),
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
      carregar(periodo, filtroProduto),
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
        { rotulo: "Leads no funil", valor: num(dados.resumo.leadsPipeline), cor: "text-pipe-ink" },
        { rotulo: "Em negociação", valor: brl(dados.resumo.valorAberto), cor: "text-pipe-ink" },
        {
          rotulo: "Previsão ponderada",
          valor: brl(dados.resumo.valorPonderado ?? 0),
          cor: "text-pipe-blue",
        },
        { rotulo: "Taxa de ganho", valor: `${dados.resumo.winRate.toFixed(0)}%`, cor: "text-pipe-ink" },
        {
          rotulo: "Novos leads no período",
          valor: num(dados.resumo.adicionadosPeriodo),
          cor: "text-pipe-ink",
        },
      ]
    : [];


  return (
    <>
      <Sidebar
        perfil={perfil}
        saldoCreditos={saldoCreditos}
        aoAbrirPerfil={() => setModalPerfilAberto(true)}
      />
      <main className="min-h-screen bg-pipe-bg px-6 py-8 lg:pl-72">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-5">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl text-pipe-ink flex items-center gap-2">
                <IconeGrafico className="w-6 h-6 text-pipe-lime" /> Dashboard
              </h1>
              <p className="text-sm text-pipe-muted mt-0.5">
                Indicadores de prospecção, conversão e resultado · FP Pipe
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dados && (
                <>
                  <button
                    onClick={exportar.csv}
                    className="bg-pipe-card border border-pipe-border text-pipe-ink-soft px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-pipe-lime/50 transition"
                  >
                    Exportar CSV
                  </button>
                  <button
                    onClick={exportar.pdf}
                    className="bg-pipe-lime text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:brightness-110 transition"
                  >
                    Exportar PDF
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
                    : "text-pipe-ink-soft hover:bg-pipe-bg border border-transparent"
                }`}
              >
                {p.rotulo}
              </button>
            ))}
            <span className="hidden sm:inline-block w-px h-6 bg-pipe-border mx-1" />
            <span className="text-xs text-pipe-muted font-semibold">
              Produto:
            </span>
            <select
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              className="bg-pipe-bg border border-pipe-border rounded-lg px-3 py-1.5 text-xs text-pipe-ink focus:outline-none focus:border-pipe-blue"
            >
              <option value="">Todos os produtos</option>
              {produtosCadastrados.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
              <option value="__sem__">Sem produto</option>
            </select>
            {filtroProduto && (
              <button
                onClick={() => setFiltroProduto("")}
                className="text-xs text-pipe-muted hover:text-pipe-lime transition"
              >
                Limpar
              </button>
            )}
            <Link
              href="/produtos"
              className="text-xs text-pipe-blue hover:text-pipe-ink font-semibold"
            >
              Gerenciar produtos
            </Link>
          </div>

          {erro && (
            <p className="text-sm text-red-700 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
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
                    <p className="text-xs text-pipe-muted">
                      {c.rotulo}
                    </p>
                    <p className={`text-2xl font-medium tracking-[-0.02em] tabular-nums mt-1 ${c.cor}`}>
                      {c.valor}
                    </p>
                  </div>
                ))}
              </div>

              {/* Atividades pendentes / a fazer */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink">
                    Atividades pendentes
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-pipe-muted">
                      De
                      <input
                        type="date"
                        value={filtroDe}
                        onChange={(e) => setFiltroDe(e.target.value)}
                        className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-1 text-xs text-pipe-ink"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-pipe-muted">
                      Até
                      <input
                        type="date"
                        value={filtroAte}
                        onChange={(e) => setFiltroAte(e.target.value)}
                        className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-1 text-xs text-pipe-ink"
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
                  <p className="text-xs text-red-700 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
                    {erroPendentes}
                  </p>
                )}

                {carregandoPendentes ? (
                  <p className="text-sm text-pipe-muted">
                    Carregando atividades…
                  </p>
                ) : pendentes.length === 0 ? (
                  <p className="text-sm text-pipe-muted">
                    Nenhuma atividade pendente. Aplicar uma cadência a um contato
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
                          <p className="text-sm font-semibold text-pipe-ink truncate">
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
                                  ? "text-red-700 font-semibold"
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
                            <p className="text-xs text-pipe-muted mt-1 line-clamp-2">
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
                            className="inline-flex items-center gap-1.5 text-xs text-pipe-ink-soft font-semibold px-2.5 py-1.5 border border-pipe-border rounded-lg hover:border-pipe-lime/40 transition"
                          >
                            <IconeEscrever className="w-4 h-4" /> Editar
                          </button>
                          <button
                            onClick={() => void alternarConcluida(a)}
                            className="inline-flex items-center gap-1.5 text-xs bg-pipe-lime text-white font-semibold px-2.5 py-1.5 rounded-lg hover:brightness-110 transition"
                          >
                            <IconeVerificado className="w-4 h-4" /> Concluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Funil de conversão */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink">Funil de conversão</h2>
                  <p className="text-xs text-pipe-muted">Empresas que chegaram a cada etapa</p>
                </div>
                <p className="text-sm text-pipe-muted mb-5">
                  A porcentagem entre as barras mostra quantas avançaram para a etapa seguinte.
                </p>
                {(() => {
                  const etapas = dados.funil.filter((f) => !f.perdido);
                  const topo = Math.max(...etapas.map((f) => f.alcancaram ?? f.atual), 1);
                  return (
                    <ol className="space-y-1">
                      {etapas.map((f, i) => {
                        const chegaram = f.alcancaram ?? f.atual;
                        const proxima = etapas[i + 1];
                        const taxa =
                          proxima && chegaram > 0
                            ? Math.round(((proxima.alcancaram ?? proxima.atual) / chegaram) * 100)
                            : null;
                        return (
                          <li key={f.id}>
                            <div className="grid grid-cols-[minmax(110px,170px)_1fr_auto] items-center gap-3">
                              <span className="truncate text-sm text-pipe-ink-soft">
                                {f.nome.charAt(0) + f.nome.slice(1).toLowerCase()}
                              </span>
                              <div className="h-7 rounded-md bg-pipe-bg">
                                <div
                                  className="h-full rounded-md bg-pipe-blue transition-all"
                                  style={{ width: `${Math.max((chegaram / topo) * 100, chegaram ? 2 : 0)}%`, opacity: 0.35 + 0.65 * (1 - i / Math.max(etapas.length, 1)) }}
                                />
                              </div>
                              <span className="w-24 text-right text-sm tabular-nums text-pipe-ink">
                                {num(chegaram)}
                                <span className="ml-1 text-xs text-pipe-muted">· {num(f.atual)} agora</span>
                              </span>
                            </div>
                            {taxa !== null && (
                              <p className="grid grid-cols-[minmax(110px,170px)_1fr_auto] gap-3 py-0.5 text-[11px] text-pipe-muted">
                                <span />
                                <span>↓ {taxa}% avançam</span>
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  );
                })()}
              </section>

              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                {/* Previsão por etapa */}
                <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5 sm:p-6">
                  <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink">Dinheiro por etapa</h2>
                  <p className="text-sm text-pipe-muted mb-5">
                    Valor em negociação e quanto dele deve fechar, pela chance de cada etapa.
                  </p>
                  {(() => {
                    const etapas = dados.funil.filter((f) => !f.perdido && f.valorAtual > 0 && f.nome.trim().toUpperCase() !== "GANHO");
                    const topo = Math.max(...etapas.map((f) => f.valorAtual), 1);
                    if (etapas.length === 0)
                      return (
                        <p className="text-sm text-pipe-muted">
                          Preencha o valor da oportunidade nos leads do CRM para ver a previsão.
                        </p>
                      );
                    return (
                      <ul className="space-y-4">
                        {etapas.map((f) => (
                          <li key={f.id}>
                            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                              <span className="text-pipe-ink-soft">
                                {f.nome.charAt(0) + f.nome.slice(1).toLowerCase()}
                                <span className="ml-1.5 text-xs text-pipe-muted">{f.probabilidade ?? 0}%</span>
                              </span>
                              <span className="tabular-nums text-pipe-ink">
                                {brl(f.valorPonderado ?? 0)}
                                <span className="ml-1 text-xs text-pipe-muted">de {brl(f.valorAtual)}</span>
                              </span>
                            </div>
                            <div className="relative h-2.5 rounded-full bg-pipe-bg">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-[#d6d4cd]"
                                style={{ width: `${(f.valorAtual / topo) * 100}%` }}
                              />
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-pipe-blue"
                                style={{ width: `${((f.valorPonderado ?? 0) / topo) * 100}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                  <div className="mt-5 flex gap-4 text-xs text-pipe-muted">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-pipe-blue" /> Previsto</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d6d4cd]" /> Em negociação</span>
                  </div>
                </section>

                {/* Motivos de perda */}
                <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5 sm:p-6">
                  <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink">Por que perdemos</h2>
                  <p className="text-sm text-pipe-muted mb-5">Motivos informados ao mover leads para Perdido.</p>
                  {(dados.motivosPerda ?? []).length === 0 ? (
                    <p className="text-sm text-pipe-muted">Nenhuma venda perdida com motivo registrado ainda.</p>
                  ) : (
                    <ul className="space-y-3">
                      {(() => {
                        const lista = dados.motivosPerda ?? [];
                        const total = lista.reduce((t, m) => t + m.total, 0) || 1;
                        return lista.map((m) => (
                          <li key={m.motivo}>
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="text-pipe-ink-soft">{m.motivo}</span>
                              <span className="tabular-nums text-pipe-ink">{Math.round((m.total / total) * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-pipe-bg">
                              <div className="h-full rounded-full bg-pipe-ink/80" style={{ width: `${(m.total / total) * 100}%` }} />
                            </div>
                          </li>
                        ));
                      })()}
                    </ul>
                  )}
                </section>
              </div>

              {/* Série temporal */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink mb-4">
                  Evolução no período
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados.serie} margin={CARTESIAN_MARGIN}>
                      <CartesianGrid vertical={false} stroke="#e9e7e1" />
                      <XAxis dataKey="rotulo" stroke="#8a8a92" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#8a8a92" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(17,17,20,0.04)" }}
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #dedbd3",
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#111114", fontWeight: 500 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "#4b4b53" }} />
                      <Bar dataKey="adicionados" name="Leads adicionados" fill="#2442e5" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="empresas" name="Empresas geradas" fill="#c9c6bd" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Resultado por produto */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink mb-1">
                  Resultado por produto
                </h2>
                <p className="text-xs text-pipe-muted mb-4">
                  {filtroProduto
                    ? `Filtrando por: ${
                        filtroProduto === "__sem__"
                          ? "Sem produto"
                          : filtroProduto
                      }`
                    : "Lead, valor e ganhos/perdidos por produto do pipeline."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dados.produtos.map((p) => (
                    <div
                      key={p.produto}
                      className="bg-pipe-bg border border-pipe-border rounded-xl p-4"
                    >
                      <p className="text-sm font-semibold text-pipe-ink line-clamp-1">
                        {p.produto}
                      </p>
                      <p className="text-lg font-display font-semibold text-pipe-lime mt-1">
                        {brl(p.valor)}
                      </p>
                      <p className="text-[11px] text-pipe-muted mt-1">
                        {num(p.total)} lead{p.total === 1 ? "" : "s"} ·{" "}
                        <span className="text-pipe-lime">{p.ganhos} ganhos</span> ·{" "}
                        <span className="text-red-700">{p.perdidos} perdidos</span>
                      </p>
                    </div>
                  ))}
                </div>
                {dados.produtos.length === 0 && (
                  <p className="text-sm text-pipe-muted">
                    Nenhum lead no pipeline até agora. Os produtos aparecem aqui
                    conforme os leads ganham produto no CRM.
                  </p>
                )}
              </section>

              {/* Atividade por vendedor */}
              <section className="bg-pipe-card border border-pipe-border rounded-2xl p-5">
                <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink mb-4">
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
                          <td className="py-2.5 pr-3 text-pipe-ink font-medium">
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
                <h2 className="text-lg font-medium tracking-[-0.01em] text-pipe-ink mb-4">
                  Empresas geradas por origem
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dados.geracao.empresasPorOrigem.map((g) => (
                    <div
                      key={g.origem}
                      className="bg-pipe-bg border border-pipe-border rounded-xl p-4"
                    >
                      <p className="text-sm font-semibold text-pipe-ink capitalize">
                        {g.origem.replace(/_/g, " ")}
                      </p>
                      <p className="text-lg font-display font-semibold text-pipe-blue mt-1">
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
                Ir para o CRM
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
    "w-full bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:border-pipe-lime outline-none mt-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={aoFechar}
    >
      <div
        className="bg-pipe-card border border-pipe-border rounded-2xl p-5 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg text-pipe-ink mb-1">Editar atividade</h3>
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
          <p className="text-xs text-red-700 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mt-3">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={aoFechar}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-pipe-ink-soft border border-pipe-border hover:border-pipe-lime/40 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-pipe-lime text-white hover:brightness-110 disabled:opacity-50 transition"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaginaMetricas;
