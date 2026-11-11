"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import MolduraCrm, { AlternarVisao } from "../../../components/crm/MolduraCrm";
import NovoNegocio from "../../../components/crm/NovoNegocio";
import { Aviso, BotaoPrimario, BotaoSecundario, Janela, Rotulo, classeCampo, formatarMoeda, valorExibido } from "../../../components/crm/ui";
import { useAtraso } from "../../../components/crm/useCamposPersonalizados";
import type { CampoPersonalizado } from "../../../lib/crm-campos";
import { ehEstagioGanho, ehEstagioPerdido, probabilidadeDoEstagio } from "../../../lib/crm-previsao";

type Etapa = { id: string; nome: string; cor: string | null; probabilidade: number | null; ordem_estagio: number };
type Membro = { usuario_id: string; nome: string | null; email: string | null };
type Negocio = {
  id: string;
  company_id: string;
  stage_id: string;
  responsavel_id: string | null;
  responsavel: { nome: string | null; email: string | null } | null;
  valor_oportunidade: number | null;
  titulo?: string | null;
  pessoa?: { id: string; nome: string | null; cargo: string | null; email: string | null; telefone: string | null } | null;
  data_prevista?: string | null;
  campos?: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  company: {
    razao_social: string | null;
    nome_fantasia: string | null;
    municipio: string | null;
    uf: string | null;
    telefone: string | null;
    email: string | null;
    segmento_icp: string | null;
    decisor_nome: string | null;
    campos?: Record<string, unknown> | null;
  } | null;
  proxima_atividade: { titulo?: string; data_hora_atividade: string } | null;
  atividade_status: "sem" | "atrasada" | "hoje" | "futura";
};
type RespostaCrm = {
  funis: { id: string; nome: string }[];
  funil_atual: string;
  campos: CampoPersonalizado[];
  stages: Etapa[];
  leads: Negocio[];
  membros: Membro[];
};

export type Filtros = {
  busca?: string;
  etapas?: string[];
  responsaveis?: string[];
  situacao?: "abertos" | "ganhos" | "perdidos" | "todos";
  atividade?: "" | "atrasada" | "hoje" | "futura" | "sem";
  valorMin?: number | null;
  valorMax?: number | null;
  previstaAte?: string;
  cidade?: string;
  campoId?: string;
  campoValor?: string;
};
type FiltroSalvo = {
  id: string;
  nome: string;
  filtros: Filtros;
  colunas: string[];
  compartilhado: boolean;
  meu: boolean;
};

const FILTROS_VAZIOS: Filtros = { situacao: "abertos" };
const COLUNAS_PADRAO = ["titulo", "organizacao", "pessoa", "etapa", "valor", "responsavel", "proxima"];
const CHAVE_COLUNAS = "fp-crm-lista-colunas";

function nomeEmpresa(n: Negocio): string {
  return n.company?.nome_fantasia?.trim() || n.company?.razao_social?.trim() || "Empresa";
}
function dataBr(v: string | null | undefined): string {
  if (!v) return "—";
  const d = v.length === 10 ? new Date(`${v}T12:00:00`) : new Date(v);
  const mesmoAno = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", ...(mesmoAno ? {} : { year: "numeric" }) })
    .format(d)
    .replace(/\./g, "")
    .replace(/ de /g, " ");
}

type Coluna = {
  chave: string;
  rotulo: string;
  grupo: "Negócio" | "Organização" | "Pessoa";
  valor: (n: Negocio, ctx: Ctx) => string | number | null;
  exibir?: (n: Negocio, ctx: Ctx) => React.ReactNode;
  numero?: boolean;
};
type Ctx = { etapa: Map<string, Etapa>; membro: Map<string, string> };

const COR_ATIVIDADE: Record<Negocio["atividade_status"], string> = {
  atrasada: "#dc2626",
  hoje: "#d97706",
  futura: "#2442e5",
  sem: "#c9c6bd",
};

function colunasBase(): Coluna[] {
  return [
    { chave: "titulo", rotulo: "Título", grupo: "Negócio", valor: (n) => n.titulo?.trim() || nomeEmpresa(n) },
    { chave: "organizacao", rotulo: "Organização", grupo: "Organização", valor: (n) => nomeEmpresa(n) },
    { chave: "pessoa", rotulo: "Pessoa de contato", grupo: "Pessoa", valor: (n) => n.pessoa?.nome ?? n.company?.decisor_nome ?? null },
    { chave: "cargo", rotulo: "Cargo", grupo: "Pessoa", valor: (n) => n.pessoa?.cargo ?? null },
    { chave: "pessoa_tel", rotulo: "Telefone da pessoa", grupo: "Pessoa", valor: (n) => n.pessoa?.telefone ?? null },
    { chave: "pessoa_email", rotulo: "E-mail da pessoa", grupo: "Pessoa", valor: (n) => n.pessoa?.email ?? null },
    {
      chave: "etapa",
      rotulo: "Etapa",
      grupo: "Negócio",
      valor: (n, c) => c.etapa.get(n.stage_id)?.ordem_estagio ?? 0,
      exibir: (n, c) => {
        const e = c.etapa.get(n.stage_id);
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: e?.cor ?? "#c9c6bd" }} aria-hidden="true" />
            {e ? e.nome.charAt(0) + e.nome.slice(1).toLowerCase() : "—"}
          </span>
        );
      },
    },
    {
      chave: "valor",
      rotulo: "Valor",
      grupo: "Negócio",
      numero: true,
      valor: (n) => n.valor_oportunidade ?? null,
      exibir: (n) => (n.valor_oportunidade != null ? formatarMoeda(n.valor_oportunidade) : "—"),
    },
    {
      chave: "ponderado",
      rotulo: "Valor ponderado",
      grupo: "Negócio",
      numero: true,
      valor: (n, c) => {
        const e = c.etapa.get(n.stage_id);
        return n.valor_oportunidade != null && e ? (n.valor_oportunidade * probabilidadeDoEstagio(e)) / 100 : null;
      },
      exibir: (n, c) => {
        const e = c.etapa.get(n.stage_id);
        return n.valor_oportunidade != null && e ? formatarMoeda((n.valor_oportunidade * probabilidadeDoEstagio(e)) / 100) : "—";
      },
    },
    { chave: "responsavel", rotulo: "Responsável", grupo: "Negócio", valor: (n, c) => (n.responsavel_id ? c.membro.get(n.responsavel_id) ?? n.responsavel?.nome ?? null : null) },
    {
      chave: "proxima",
      rotulo: "Próxima atividade",
      grupo: "Negócio",
      valor: (n) => n.proxima_atividade?.data_hora_atividade ?? null,
      exibir: (n) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: COR_ATIVIDADE[n.atividade_status] }} aria-hidden="true" />
          {n.proxima_atividade ? dataBr(n.proxima_atividade.data_hora_atividade) : "Nenhuma"}
        </span>
      ),
    },
    { chave: "previsao", rotulo: "Previsão de fechamento", grupo: "Negócio", valor: (n) => n.data_prevista ?? null, exibir: (n) => dataBr(n.data_prevista) },
    { chave: "cidade", rotulo: "Cidade", grupo: "Organização", valor: (n) => [n.company?.municipio, n.company?.uf].filter(Boolean).join(" · ") || null },
    { chave: "telefone", rotulo: "Telefone da organização", grupo: "Organização", valor: (n) => n.company?.telefone ?? null },
    { chave: "segmento", rotulo: "Segmento", grupo: "Organização", valor: (n) => n.company?.segmento_icp ?? null },
    { chave: "criado", rotulo: "Criado em", grupo: "Negócio", valor: (n) => n.criado_em, exibir: (n) => dataBr(n.criado_em) },
    { chave: "atualizado", rotulo: "Atualizado em", grupo: "Negócio", valor: (n) => n.atualizado_em, exibir: (n) => dataBr(n.atualizado_em) },
  ];
}

function colunasPersonalizadas(campos: CampoPersonalizado[]): Coluna[] {
  return campos
    .filter((c) => c.entidade === "negocio" || c.entidade === "organizacao")
    .map((c) => {
      const ler = (n: Negocio) => (c.entidade === "negocio" ? n.campos?.[c.id] : n.company?.campos?.[c.id]);
      return {
        chave: `campo:${c.id}`,
        rotulo: c.nome,
        grupo: c.entidade === "negocio" ? ("Negócio" as const) : ("Organização" as const),
        numero: c.tipo === "numero" || c.tipo === "moeda",
        valor: (n: Negocio) => {
          const v = ler(n);
          return typeof v === "number" || typeof v === "string" ? v : null;
        },
        exibir: (n: Negocio) => {
          const v = ler(n);
          if (c.tipo === "url" && typeof v === "string" && v) {
            return (
              <a href={v} target="_blank" rel="noreferrer" className="text-pipe-blue hover:underline" onClick={(e) => e.stopPropagation()}>
                Abrir
              </a>
            );
          }
          return valorExibido(c, v);
        },
      };
    });
}

/** Aplica os filtros a um negócio. */
function passa(n: Negocio, f: Filtros, ctx: Ctx): boolean {
  const etapa = ctx.etapa.get(n.stage_id);
  const situacao = f.situacao ?? "abertos";
  if (situacao !== "todos") {
    const ganho = ehEstagioGanho(etapa?.nome);
    const perdido = ehEstagioPerdido(etapa?.nome);
    if (situacao === "abertos" && (ganho || perdido)) return false;
    if (situacao === "ganhos" && !ganho) return false;
    if (situacao === "perdidos" && !perdido) return false;
  }
  if (f.etapas?.length && !f.etapas.includes(n.stage_id)) return false;
  if (f.responsaveis?.length && !f.responsaveis.includes(n.responsavel_id ?? "sem")) return false;
  if (f.atividade && n.atividade_status !== f.atividade) return false;
  if (f.valorMin != null && (n.valor_oportunidade ?? 0) < f.valorMin) return false;
  if (f.valorMax != null && (n.valor_oportunidade ?? 0) > f.valorMax) return false;
  if (f.previstaAte && (!n.data_prevista || n.data_prevista > f.previstaAte)) return false;
  if (f.cidade?.trim()) {
    const alvo = `${n.company?.municipio ?? ""} ${n.company?.uf ?? ""}`.toLowerCase();
    if (!alvo.includes(f.cidade.trim().toLowerCase())) return false;
  }
  if (f.campoId && f.campoValor?.trim()) {
    const v = n.campos?.[f.campoId] ?? n.company?.campos?.[f.campoId];
    if (v === undefined || v === null || !String(v).toLowerCase().includes(f.campoValor.trim().toLowerCase())) return false;
  }
  if (f.busca?.trim()) {
    const t = f.busca.trim().toLowerCase();
    const alvo = [n.titulo, nomeEmpresa(n), n.pessoa?.nome, n.company?.decisor_nome, n.company?.municipio, n.pessoa?.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!alvo.includes(t)) return false;
  }
  return true;
}

function contarFiltros(f: Filtros): number {
  let n = 0;
  if (f.etapas?.length) n++;
  if (f.responsaveis?.length) n++;
  if (f.situacao && f.situacao !== "abertos") n++;
  if (f.atividade) n++;
  if (f.valorMin != null || f.valorMax != null) n++;
  if (f.previstaAte) n++;
  if (f.cidade?.trim()) n++;
  if (f.campoId && f.campoValor?.trim()) n++;
  return n;
}

function csv(linhas: (string | number | null)[][]): string {
  return linhas
    .map((l) =>
      l
        .map((v) => {
          const t = v === null ? "" : String(v);
          return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
        })
        .join(";")
    )
    .join("\n");
}

export default function ListaNegocios() {
  const [funilId, setFunilId] = useState("");
  const [dados, setDados] = useState<RespostaCrm | null>(null);
  const [erro, setErro] = useState("");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useAtraso(busca);
  const [colunas, setColunas] = useState<string[]>(COLUNAS_PADRAO);
  const [ordem, setOrdem] = useState<{ chave: string; asc: boolean }>({ chave: "atualizado", asc: false });
  const [salvos, setSalvos] = useState<FiltroSalvo[]>([]);
  const [salvoAtual, setSalvoAtual] = useState<string>("");
  const [painelFiltros, setPainelFiltros] = useState(false);
  const [painelColunas, setPainelColunas] = useState(false);
  const [janelaSalvar, setJanelaSalvar] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState("");
  const [novoNegocio, setNovoNegocio] = useState(false);

  const carregar = useCallback(async (funil: string) => {
    try {
      const res = await fetch(`/api/crm${funil ? `?funil=${encodeURIComponent(funil)}` : ""}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível carregar os negócios.");
      setDados(d);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os negócios.");
    }
  }, []);

  const carregarSalvos = useCallback(async () => {
    const res = await fetch("/api/crm/filtros?entidade=negocio", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (res.ok) setSalvos(d.filtros ?? []);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      let inicial = "";
      try {
        inicial = localStorage.getItem("fp-crm-funil") ?? "";
        const c = JSON.parse(localStorage.getItem(CHAVE_COLUNAS) ?? "null");
        if (Array.isArray(c) && c.length) setColunas(c.filter((x) => typeof x === "string"));
      } catch {
        /* sem armazenamento local */
      }
      setFunilId(inicial);
      void carregar(inicial);
      void carregarSalvos();
    }, 0);
    return () => clearTimeout(id);
  }, [carregar, carregarSalvos]);

  const filtrosAtivos = useMemo(() => ({ ...filtros, busca: buscaAtrasada }), [filtros, buscaAtrasada]);

  const ctx: Ctx = useMemo(
    () => ({
      etapa: new Map((dados?.stages ?? []).map((e) => [e.id, e])),
      membro: new Map((dados?.membros ?? []).map((m) => [m.usuario_id, m.nome || m.email || "Membro"])),
    }),
    [dados]
  );
  const todasColunas = useMemo(() => [...colunasBase(), ...colunasPersonalizadas(dados?.campos ?? [])], [dados]);
  const mapaColunas = useMemo(() => new Map(todasColunas.map((c) => [c.chave, c])), [todasColunas]);
  const visiveis = colunas.map((c) => mapaColunas.get(c)).filter((c): c is Coluna => Boolean(c));

  const linhas = useMemo(() => {
    const lista = (dados?.leads ?? []).filter((n) => passa(n, filtrosAtivos, ctx));
    const col = mapaColunas.get(ordem.chave);
    if (col) {
      lista.sort((a, b) => {
        const va = col.valor(a, ctx);
        const vb = col.valor(b, ctx);
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
        return ordem.asc ? r : -r;
      });
    }
    return lista;
  }, [dados, filtrosAtivos, ctx, ordem, mapaColunas]);

  const totalValor = linhas.reduce((s, n) => s + (n.valor_oportunidade ?? 0), 0);

  function trocarFunil(id: string) {
    setFunilId(id);
    setSelecionados(new Set());
    setFiltros((f) => ({ ...f, etapas: [] }));
    try {
      localStorage.setItem("fp-crm-funil", id);
    } catch {
      /* ignora */
    }
    void carregar(id);
  }

  function guardarColunas(novas: string[]) {
    setColunas(novas);
    try {
      localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(novas));
    } catch {
      /* ignora */
    }
  }

  function aplicarSalvo(id: string) {
    setSalvoAtual(id);
    const s = salvos.find((x) => x.id === id);
    if (!s) {
      setFiltros(FILTROS_VAZIOS);
      setBusca("");
      return;
    }
    const { busca: b, ...resto } = s.filtros ?? {};
    setFiltros({ ...FILTROS_VAZIOS, ...resto });
    setBusca(b ?? "");
    if (s.colunas?.length) guardarColunas(s.colunas);
  }

  async function atualizarSalvo() {
    const s = salvos.find((x) => x.id === salvoAtual);
    if (!s) return;
    const res = await fetch("/api/crm/filtros", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, filtros: { ...filtros, busca }, colunas }),
    });
    const d = await res.json().catch(() => null);
    setAviso(res.ok ? `Filtro "${s.nome}" atualizado.` : d?.erro ?? "Não foi possível atualizar.");
    if (res.ok) void carregarSalvos();
  }

  async function apagarSalvo() {
    const s = salvos.find((x) => x.id === salvoAtual);
    if (!s || !window.confirm(`Apagar o filtro "${s.nome}"?`)) return;
    const res = await fetch(`/api/crm/filtros?id=${s.id}`, { method: "DELETE" });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setAviso(d?.erro ?? "Não foi possível apagar.");
      return;
    }
    setSalvoAtual("");
    setAviso(`Filtro "${s.nome}" apagado.`);
    void carregarSalvos();
  }

  async function trocarResponsavelEmMassa(responsavel: string) {
    if (!responsavel || selecionados.size === 0) return;
    let falhas = 0;
    for (const id of selecionados) {
      const res = await fetch(`/api/crm/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsavel_id: responsavel }),
      });
      if (!res.ok) falhas++;
    }
    setAviso(falhas ? `${falhas} negócio(s) não foram alterados.` : `Responsável trocado em ${selecionados.size} negócio(s).`);
    setSelecionados(new Set());
    void carregar(funilId);
  }

  function exportar() {
    const alvo = selecionados.size ? linhas.filter((n) => selecionados.has(n.id)) : linhas;
    const conteudo = csv([
      visiveis.map((c) => c.rotulo),
      ...alvo.map((n) =>
        visiveis.map((c) => {
          if (c.chave === "etapa") return ctx.etapa.get(n.stage_id)?.nome ?? null;
          return c.valor(n, ctx);
        })
      ),
    ]);
    const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `negocios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const qtdFiltros = contarFiltros(filtros);
  const todosMarcados = linhas.length > 0 && linhas.every((n) => selecionados.has(n.id));
  const salvoSel = salvos.find((s) => s.id === salvoAtual);

  return (
    <MolduraCrm
      titulo="Negócios"
      largura="max-w-[1400px]"
      acoes={
        <>
          <AlternarVisao
            opcoes={[
              { href: "/crm", rotulo: "Kanban", ativa: false },
              { href: "/crm/lista", rotulo: "Lista", ativa: true },
            ]}
          />
          <BotaoPrimario onClick={() => setNovoNegocio(true)}>+ Negócio</BotaoPrimario>
        </>
      }
    >
      {/* Barra: funil, filtro salvo, busca, filtros e colunas */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(dados?.funis.length ?? 0) > 1 && (
          <select
            aria-label="Funil"
            value={funilId || dados?.funil_atual || ""}
            onChange={(e) => trocarFunil(e.target.value)}
            className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
          >
            {dados?.funis.map((f) => (
              <option key={f.id} value={f.id}>
                Funil: {f.nome}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filtro salvo"
          value={salvoAtual}
          onChange={(e) => aplicarSalvo(e.target.value)}
          className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
        >
          <option value="">Todos os negócios abertos</option>
          {salvos.some((s) => s.meu) && (
            <optgroup label="Meus filtros">
              {salvos
                .filter((s) => s.meu)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                    {s.compartilhado ? " · equipe" : ""}
                  </option>
                ))}
            </optgroup>
          )}
          {salvos.some((s) => !s.meu) && (
            <optgroup label="Da equipe">
              {salvos
                .filter((s) => !s.meu)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar título, organização, pessoa…"
          aria-label="Buscar negócios"
          className="min-w-[220px] flex-1 rounded-full border border-pipe-border bg-white px-4 py-2 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:border-pipe-blue focus:outline-none"
        />
        <BotaoSecundario onClick={() => setPainelFiltros((v) => !v)} aria-expanded={painelFiltros} className="!py-2">
          Filtros{qtdFiltros ? ` · ${qtdFiltros}` : ""}
        </BotaoSecundario>
        <BotaoSecundario onClick={() => setPainelColunas(true)} className="!py-2">
          Colunas
        </BotaoSecundario>
        <BotaoSecundario onClick={exportar} className="!py-2">
          Exportar
        </BotaoSecundario>
      </div>

      {painelFiltros && dados && (
        <PainelFiltros
          filtros={filtros}
          etapas={dados.stages}
          membros={dados.membros}
          campos={(dados.campos ?? []).filter((c) => c.entidade !== "pessoa")}
          aoMudar={setFiltros}
          aoLimpar={() => {
            setFiltros(FILTROS_VAZIOS);
            setBusca("");
            setSalvoAtual("");
          }}
          aoSalvarNovo={() => setJanelaSalvar(true)}
          salvoAtual={salvoSel ?? null}
          aoAtualizarSalvo={atualizarSalvo}
          aoApagarSalvo={apagarSalvo}
        />
      )}

      {aviso && (
        <div className="mb-3">
          <Aviso tipo="ok">{aviso}</Aviso>
        </div>
      )}
      {erro && (
        <div className="mb-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}

      {/* Resumo e ações em massa */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-sm text-pipe-muted">
        <p>
          <span className="font-medium text-pipe-ink">{linhas.length}</span> negócio{linhas.length === 1 ? "" : "s"}
          {totalValor > 0 && <> · {formatarMoeda(totalValor)}</>}
        </p>
        {selecionados.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span>{selecionados.size} selecionado(s)</span>
            <select
              aria-label="Trocar responsável dos selecionados"
              defaultValue=""
              onChange={(e) => void trocarResponsavelEmMassa(e.target.value)}
              className="rounded-full border border-pipe-border bg-white px-3 py-1.5 text-sm text-pipe-ink"
            >
              <option value="" disabled>
                Trocar responsável…
              </option>
              {dados?.membros.map((m) => (
                <option key={m.usuario_id} value={m.usuario_id}>
                  {m.nome || m.email}
                </option>
              ))}
            </select>
            <button onClick={() => setSelecionados(new Set())} className="text-pipe-muted underline-offset-4 hover:text-pipe-ink hover:underline">
              Limpar seleção
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-pipe-border bg-pipe-card">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-pipe-border text-left text-xs text-pipe-muted">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={todosMarcados}
                  onChange={() => setSelecionados(todosMarcados ? new Set() : new Set(linhas.map((n) => n.id)))}
                  className="accent-[#2442e5]"
                />
              </th>
              {visiveis.map((c) => (
                <th key={c.chave} className={`whitespace-nowrap px-3 py-3 font-medium ${c.numero ? "text-right" : ""}`}>
                  <button
                    onClick={() => setOrdem((o) => ({ chave: c.chave, asc: o.chave === c.chave ? !o.asc : true }))}
                    className="inline-flex items-center gap-1 hover:text-pipe-ink"
                  >
                    {c.rotulo}
                    {ordem.chave === c.chave && <span aria-hidden="true">{ordem.asc ? "↑" : "↓"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!dados && !erro && (
              <tr>
                <td colSpan={visiveis.length + 1} className="px-3 py-10 text-center text-pipe-muted">
                  Carregando negócios…
                </td>
              </tr>
            )}
            {dados && linhas.length === 0 && (
              <tr>
                <td colSpan={visiveis.length + 1} className="px-3 py-10 text-center text-pipe-muted">
                  Nenhum negócio com esses filtros.
                </td>
              </tr>
            )}
            {linhas.map((n) => (
              <tr key={n.id} className="border-b border-pipe-border/70 last:border-0 hover:bg-pipe-bg/60">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${nomeEmpresa(n)}`}
                    checked={selecionados.has(n.id)}
                    onChange={() =>
                      setSelecionados((s) => {
                        const novo = new Set(s);
                        if (novo.has(n.id)) novo.delete(n.id);
                        else novo.add(n.id);
                        return novo;
                      })
                    }
                    className="accent-[#2442e5]"
                  />
                </td>
                {visiveis.map((c, i) => (
                  <td key={c.chave} className={`max-w-[280px] truncate px-3 py-2.5 text-pipe-ink-soft ${c.numero ? "text-right tabular-nums" : ""}`}>
                    {i === 0 ? (
                      <Link href={`/crm?empresa=${n.company_id}`} className="font-medium text-pipe-ink hover:text-pipe-blue">
                        {c.exibir ? c.exibir(n, ctx) : c.valor(n, ctx) ?? "—"}
                      </Link>
                    ) : c.exibir ? (
                      c.exibir(n, ctx)
                    ) : (
                      c.valor(n, ctx) ?? "—"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JanelaColunas
        aberta={painelColunas}
        todas={todasColunas}
        escolhidas={colunas}
        aoFechar={() => setPainelColunas(false)}
        aoSalvar={(c) => {
          guardarColunas(c);
          setPainelColunas(false);
        }}
      />

      <JanelaSalvarFiltro
        aberta={janelaSalvar}
        aoFechar={() => setJanelaSalvar(false)}
        aoSalvar={async (nome, compartilhado) => {
          const res = await fetch("/api/crm/filtros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, entidade: "negocio", filtros: { ...filtros, busca }, colunas, compartilhado }),
          });
          const d = await res.json().catch(() => null);
          if (!res.ok) return d?.erro ?? "Não foi possível salvar.";
          await carregarSalvos();
          setSalvoAtual(d.filtro.id);
          setJanelaSalvar(false);
          setAviso(`Filtro "${nome}" salvo.`);
          return null;
        }}
      />

      <NovoNegocio
        key={`novo-${novoNegocio}`}
        aberto={novoNegocio}
        aoFechar={() => setNovoNegocio(false)}
        funilInicial={funilId || dados?.funil_atual || null}
        aoCriar={() => {
          setNovoNegocio(false);
          void carregar(funilId);
        }}
      />
    </MolduraCrm>
  );
}

function Chips<T extends string>({
  opcoes,
  marcadas,
  aoMudar,
}: {
  opcoes: { valor: T; rotulo: string }[];
  marcadas: T[];
  aoMudar: (v: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativo = marcadas.includes(o.valor);
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoMudar(ativo ? marcadas.filter((x) => x !== o.valor) : [...marcadas, o.valor])}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              ativo ? "border-pipe-ink bg-pipe-ink text-white" : "border-pipe-border bg-white text-pipe-ink-soft hover:border-pipe-ink/40"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

function PainelFiltros({
  filtros,
  etapas,
  membros,
  campos,
  aoMudar,
  aoLimpar,
  aoSalvarNovo,
  salvoAtual,
  aoAtualizarSalvo,
  aoApagarSalvo,
}: {
  filtros: Filtros;
  etapas: Etapa[];
  membros: Membro[];
  campos: CampoPersonalizado[];
  aoMudar: (f: Filtros) => void;
  aoLimpar: () => void;
  aoSalvarNovo: () => void;
  salvoAtual: FiltroSalvo | null;
  aoAtualizarSalvo: () => void;
  aoApagarSalvo: () => void;
}) {
  const set = (p: Partial<Filtros>) => aoMudar({ ...filtros, ...p });
  const numero = (v: string) => (v.trim() === "" ? null : Number(v.replace(/\./g, "").replace(",", ".")) || 0);
  return (
    <section aria-label="Filtros" className="mb-4 grid gap-5 rounded-2xl border border-pipe-border bg-pipe-card p-5 md:grid-cols-2 xl:grid-cols-3">
      <div>
        <Rotulo>Situação</Rotulo>
        <select value={filtros.situacao ?? "abertos"} onChange={(e) => set({ situacao: e.target.value as Filtros["situacao"] })} className={classeCampo}>
          <option value="abertos">Abertos</option>
          <option value="ganhos">Ganhos</option>
          <option value="perdidos">Perdidos</option>
          <option value="todos">Todos</option>
        </select>
      </div>
      <div>
        <Rotulo>Próxima atividade</Rotulo>
        <select value={filtros.atividade ?? ""} onChange={(e) => set({ atividade: e.target.value as Filtros["atividade"] })} className={classeCampo}>
          <option value="">Qualquer</option>
          <option value="atrasada">Atrasada</option>
          <option value="hoje">Para hoje</option>
          <option value="futura">Agendada</option>
          <option value="sem">Sem atividade</option>
        </select>
      </div>
      <div>
        <Rotulo>Previsão de fechamento até</Rotulo>
        <input type="date" value={filtros.previstaAte ?? ""} onChange={(e) => set({ previstaAte: e.target.value })} className={classeCampo} />
      </div>
      <div className="md:col-span-2 xl:col-span-3">
        <Rotulo>Etapas</Rotulo>
        <Chips opcoes={etapas.map((e) => ({ valor: e.id, rotulo: e.nome.charAt(0) + e.nome.slice(1).toLowerCase() }))} marcadas={filtros.etapas ?? []} aoMudar={(v) => set({ etapas: v })} />
      </div>
      <div className="md:col-span-2 xl:col-span-3">
        <Rotulo>Responsáveis</Rotulo>
        <Chips
          opcoes={[...membros.map((m) => ({ valor: m.usuario_id, rotulo: m.nome || m.email || "Membro" })), { valor: "sem", rotulo: "Sem responsável" }]}
          marcadas={filtros.responsaveis ?? []}
          aoMudar={(v) => set({ responsaveis: v })}
        />
      </div>
      <div>
        <Rotulo>Valor (R$)</Rotulo>
        <div className="flex items-center gap-2">
          <input inputMode="decimal" placeholder="mín." value={filtros.valorMin ?? ""} onChange={(e) => set({ valorMin: numero(e.target.value) })} className={classeCampo} aria-label="Valor mínimo" />
          <span className="text-pipe-muted">a</span>
          <input inputMode="decimal" placeholder="máx." value={filtros.valorMax ?? ""} onChange={(e) => set({ valorMax: numero(e.target.value) })} className={classeCampo} aria-label="Valor máximo" />
        </div>
      </div>
      <div>
        <Rotulo>Cidade ou UF</Rotulo>
        <input value={filtros.cidade ?? ""} onChange={(e) => set({ cidade: e.target.value })} placeholder="Ex.: Béziers" className={classeCampo} />
      </div>
      {campos.length > 0 && (
        <div>
          <Rotulo>Campo personalizado</Rotulo>
          <div className="flex gap-2">
            <select value={filtros.campoId ?? ""} onChange={(e) => set({ campoId: e.target.value })} className={classeCampo} aria-label="Campo">
              <option value="">Escolha…</option>
              {campos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {(() => {
              const c = campos.find((x) => x.id === filtros.campoId);
              return c?.tipo === "opcao" ? (
                <select value={filtros.campoValor ?? ""} onChange={(e) => set({ campoValor: e.target.value })} className={classeCampo} aria-label="Valor">
                  <option value="">Qualquer</option>
                  {c.opcoes.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input value={filtros.campoValor ?? ""} onChange={(e) => set({ campoValor: e.target.value })} placeholder="contém…" className={classeCampo} aria-label="Valor" />
              );
            })()}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-pipe-border pt-4 md:col-span-2 xl:col-span-3">
        <BotaoPrimario onClick={aoSalvarNovo}>Salvar como filtro</BotaoPrimario>
        {salvoAtual?.meu && (
          <>
            <BotaoSecundario onClick={aoAtualizarSalvo}>Atualizar &quot;{salvoAtual.nome}&quot;</BotaoSecundario>
            <BotaoSecundario onClick={aoApagarSalvo}>Apagar filtro</BotaoSecundario>
          </>
        )}
        <button onClick={aoLimpar} className="ml-auto text-sm text-pipe-muted underline-offset-4 hover:text-pipe-ink hover:underline">
          Limpar filtros
        </button>
      </div>
    </section>
  );
}

function JanelaColunas({
  aberta,
  todas,
  escolhidas,
  aoFechar,
  aoSalvar,
}: {
  aberta: boolean;
  todas: Coluna[];
  escolhidas: string[];
  aoFechar: () => void;
  aoSalvar: (c: string[]) => void;
}) {
  const [sel, setSel] = useState<string[]>(escolhidas);
  const [aberturaAnterior, setAberturaAnterior] = useState(aberta);
  if (aberta !== aberturaAnterior) {
    setAberturaAnterior(aberta);
    if (aberta) setSel(escolhidas);
  }
  const mover = (i: number, d: number) =>
    setSel((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const mapa = new Map(todas.map((c) => [c.chave, c]));
  const grupos = ["Negócio", "Organização", "Pessoa"] as const;
  return (
    <Janela aberta={aberta} titulo="Colunas da lista" aoFechar={aoFechar} largura="max-w-2xl">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-pipe-ink-soft">Mostrar</p>
          {grupos.map((g) => (
            <fieldset key={g} className="mb-3">
              <legend className="mb-1 text-[11px] uppercase tracking-wider text-pipe-muted">{g}</legend>
              {todas
                .filter((c) => c.grupo === g)
                .map((c) => (
                  <label key={c.chave} className="flex items-center gap-2 py-1 text-sm text-pipe-ink">
                    <input
                      type="checkbox"
                      className="accent-[#2442e5]"
                      checked={sel.includes(c.chave)}
                      onChange={() => setSel((s) => (s.includes(c.chave) ? s.filter((x) => x !== c.chave) : [...s, c.chave]))}
                    />
                    {c.rotulo}
                  </label>
                ))}
            </fieldset>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-pipe-ink-soft">Ordem</p>
          <ol className="space-y-1">
            {sel.map((k, i) => (
              <li key={k} className="flex items-center justify-between rounded-lg border border-pipe-border bg-white px-3 py-1.5 text-sm">
                <span className="truncate">{mapa.get(k)?.rotulo ?? k}</span>
                <span className="flex gap-1">
                  <button type="button" onClick={() => mover(i, -1)} aria-label={`Subir ${mapa.get(k)?.rotulo}`} className="h-7 w-7 rounded-full text-pipe-muted hover:bg-pipe-dark">
                    ↑
                  </button>
                  <button type="button" onClick={() => mover(i, 1)} aria-label={`Descer ${mapa.get(k)?.rotulo}`} className="h-7 w-7 rounded-full text-pipe-muted hover:bg-pipe-dark">
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="mt-6 flex justify-between gap-2">
        <BotaoSecundario onClick={() => setSel(COLUNAS_PADRAO)}>Restaurar padrão</BotaoSecundario>
        <BotaoPrimario onClick={() => aoSalvar(sel.length ? sel : COLUNAS_PADRAO)}>Aplicar</BotaoPrimario>
      </div>
    </Janela>
  );
}

function JanelaSalvarFiltro({
  aberta,
  aoFechar,
  aoSalvar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  aoSalvar: (nome: string, compartilhado: boolean) => Promise<string | null>;
}) {
  const [nome, setNome] = useState("");
  const [compartilhado, setCompartilhado] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  return (
    <Janela aberta={aberta} titulo="Salvar filtro" aoFechar={aoFechar}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nome.trim()) return setErro("Dê um nome ao filtro.");
          setSalvando(true);
          const r = await aoSalvar(nome.trim(), compartilhado);
          setSalvando(false);
          if (r) setErro(r);
          else {
            setNome("");
            setErro("");
          }
        }}
      >
        <div>
          <Rotulo htmlFor="nome-filtro">Nome</Rotulo>
          <input id="nome-filtro" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: PAP Béziers — sem atividade" className={classeCampo} />
        </div>
        <label className="flex items-center gap-2 text-sm text-pipe-ink">
          <input type="checkbox" className="accent-[#2442e5]" checked={compartilhado} onChange={(e) => setCompartilhado(e.target.checked)} />
          Compartilhar com a equipe
        </label>
        <p className="text-xs text-pipe-muted">O filtro guarda os critérios e as colunas que estão na tela agora.</p>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="flex justify-end">
          <BotaoPrimario type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </BotaoPrimario>
        </div>
      </form>
    </Janela>
  );
}
