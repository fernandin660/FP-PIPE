"use client";

/* eslint-disable react-hooks/preserve-manual-memoization */

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { criarClienteSupabase } from "../../lib/supabase/client";
import { formatarCnpj } from "../../lib/conhecimento-cnae";
import type { PrioridadeResultado } from "../../lib/prioridade";
import {
  gerarLinkBuscaEmpresa,
  gerarLinkBuscaPessoas,
} from "../../lib/linkedin-links";
import Sidebar from "../../components/Sidebar";
import ModalPerfil, {
  type PerfilVendedor,
} from "../../components/ModalPerfil";
import { LeadCard } from "../../components/LeadCard";
import { AbasCrm } from "../../components/crm/MolduraCrm";
import NovoNegocio from "../../components/crm/NovoNegocio";
import { BlocoCampos } from "../../components/crm/ui";
import type { CampoPersonalizado } from "../../lib/crm-campos";
import { MOTIVOS_PERDA, ehEstagioGanho, ehEstagioPerdido, probabilidadeDoEstagio } from "../../lib/crm-previsao";
import { IconeTelefone, IconeEmail } from "../../components/Icones";

export type Estagio = {
  id: string;
  nome: string;
  cor: string;
  ordem_estagio: number;
  probabilidade?: number | null;
  criado_em: string;
};

export type EmpresaCrm = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  segmento_icp: string | null;
  municipio: string | null;
  uf: string | null;
  score: number | null;
  score_motivo: string | null;
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  origem: string | null;
  decisor_nome: string | null;
  decisor_cargo: string | null;
  campeao_nome: string | null;
  campeao_cargo: string | null;
  campeao_email: string | null;
  campeao_telefone: string | null;
  campeao_linkedin: string | null;
  aprovador_nome: string | null;
  aprovador_cargo: string | null;
  aprovador_email: string | null;
  aprovador_telefone: string | null;
  aprovador_linkedin: string | null;
  cargo_prioritario: string | null;
  porte: string | null;
  cnae_descricao: string | null;
  capital_social: number | null;
  data_abertura: string | null;
  confirmado: boolean | null;
  endereco: string | null;
  informacoes_adicionais: string | null;
  interpretacao_ia: string | null;
};

type MembroOrg = {
  usuario_id: string;
  nome: string | null;
  email: string | null;
};

type UltimoEvento = {
  tipo_evento: string;
  dados: Record<string, unknown>;
  stage_origem_nome: string | null;
  stage_destino_nome: string | null;
  usuario_nome: string | null;
  criado_em: string;
};

type ProximaAtividade = {
  id: string;
  tipo_atividade: string;
  titulo: string;
  data_hora_atividade: string;
};

export type LeadCrm = {
  id: string;
  company_id: string;
  stage_id: string;
  responsavel_id: string | null;
  responsavel: { nome: string | null; email: string | null } | null;
  ordenacao: number;
  valor_oportunidade: number | null;
  produto: string | null;
  motivo_perda?: string | null;
  pipeline_id?: string;
  titulo?: string | null;
  pessoa_id?: string | null;
  pessoa?: { id: string; nome: string | null; cargo: string | null; email: string | null; telefone: string | null } | null;
  data_prevista?: string | null;
  campos?: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  company: EmpresaCrm | null;
  company_inconsistente: boolean;
  ultimo_evento: UltimoEvento | null;
  proxima_atividade: ProximaAtividade | null;
  atividade_status: "sem" | "atrasada" | "hoje" | "futura";
  prioridade: PrioridadeResultado;
};

type EventoHistorico = {
  id: string;
  tipo_evento: string;
  dados: Record<string, unknown>;
  stage_origem_id: string | null;
  stage_destino_id: string | null;
  usuario_id: string | null;
  criado_em: string;
};

type ProdutoCadastro = {
  id: string;
  nome: string;
};

export type EmpresaPick = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  segmento_icp: string | null;
  municipio: string | null;
  uf: string | null;
  score: number | null;
};

type DecisorItem = {
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  papel: string;
  rotulo: string;
  inferido: boolean;
  fonte: string;
};

type SinalItem = {
  id: string;
  tipo: string;
  descricao: string;
  data: string | null;
  fonte: string;
  confianca: number;
  relevancia: number;
  criado_em: string;
};

type InteligenciaCrm = {
  empresa: { nome: string | null; cnpj: string | null; segmento_icp: string | null };
  interpretacao_ia: string | null;
  prioridade: PrioridadeResultado;
  por_que_prospectar: string[];
  decisores: DecisorItem[];
  contatos_mapeados: number;
  sinais: SinalItem[];
  fatos_cadastrais: string[];
  tipos_sinal: string[];
  rotulo_papel: Record<string, string>;
};

const ROTULO_EVENTO: Record<string, string> = {
  lead_adicionado: "Adicionado ao pipeline",
  mudanca_estagio: "Mudança de estágio",
  responsavel_definido: "Responsável definido",
  lead_removido: "Removido do pipeline",
  atividade: "Atividade",
  atividade_programada: "Atividade programada (cadência)",
  cadencia_iniciada: "Cadência iniciada",
  oportunidade_atualizada: "Dados da oportunidade atualizados",
  disparo_enviado: "Disparo em massa (e-mail enviado)",
};

const COR_ATIVIDADE_STATUS: Record<string, string> = {
  atrasada: "#dc2626",
  hoje: "#d97706",
  sem: "#c9c6bd",
  futura: "#2442e5",
};

const ROTULO_ATIVIDADE_STATUS: Record<string, string> = {
  atrasada: "Atividade atrasada",
  hoje: "Atividade para hoje",
  sem: "Sem atividade",
  futura: "Atividade programada no futuro",
};

const ROTULO_TIPO_ATIVIDADE: Record<string, string> = {
  email: "E-mail",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  observacao: "Observação",
};

const ROTULO_TIPO_SINAL: Record<string, string> = {
  contratacao: "Contratação",
  expansao: "Expansão",
  nova_filial: "Nova filial",
  mudanca_lideranca: "Mudança de liderança",
  novo_decisor: "Novo decisor",
  tecnologia: "Tecnologia",
  crescimento: "Crescimento",
  evento: "Evento",
  outro: "Outro",
};

const TIPOS_ATIVIDADE = [
  "email",
  "telefone",
  "whatsapp",
  "linkedin",
  "reuniao",
  "tarefa",
  "observacao",
];

type EtapaCadencia = {
  id: string;
  ordem: number;
  tipo_atividade: string;
  titulo: string;
  atraso_dias: number;
  script: string;
};

type CadenciaModelo = {
  id: string;
  nome: string;
  descricao: string;
  criado_em: string;
  etapas: EtapaCadencia[];
};

type CadenciaAtiva = {
  id: string;
  cadencia_id: string;
  etapa_atual_id: string | null;
  proxima_em: string | null;
  status: string;
};

function nomeEmpresa(e: EmpresaCrm | EmpresaPick | null): string {
  return (
    e?.nome_fantasia ||
    e?.razao_social ||
    (e?.cnpj ? formatarCnpj(e.cnpj) : "Empresa sem nome")
  );
}

function nomePessoa(l: LeadCrm): string {
  const c = l.company;
  return (
    c?.campeao_nome ||
    c?.decisor_nome ||
    "Sem responsável na empresa"
  );
}

function cargoPessoa(l: LeadCrm): string | null {
  const c = l.company;
  return (
    c?.campeao_cargo ||
    c?.decisor_cargo ||
    c?.cargo_prioritario ||
    null
  );
}

function corScore(score: number | null): string {
  if (score === null) return "bg-gray-500/20 text-pipe-ink-soft";
  if (score >= 80) return "bg-pipe-lime/15 text-pipe-lime";
  if (score >= 50) return "bg-yellow-500/15 text-amber-700";
  return "bg-red-500/15 text-red-700";
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaginaCrm() {
  const router = useRouter();

  const [etagias, setEtagias] = useState<Estagio[]>([]);
  const [leads, setLeads] = useState<LeadCrm[]>([]);
  const [membros, setMembros] = useState<MembroOrg[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  // Inteligência da empresa selecionada
  const [inteligencia, setInteligencia] = useState<InteligenciaCrm | null>(null);
  const [carregandoInteligencia, setCarregandoInteligencia] = useState(false);
  const [erroInteligencia, setErroInteligencia] = useState("");
  const [gerandoInterpretacao, setGerandoInterpretacao] = useState(false);
  const [salvandoSinal, setSalvandoSinal] = useState(false);
  const [sinalForm, setSinalForm] = useState({
    tipo: "outro",
    descricao: "",
    data: "",
    fonte: "manual",
    confianca: 50,
    relevancia: 50,
  });

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const filtroTextoDebounced = useDeferredValue(filtroTexto);
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");
  const [filtroScore, setFiltroScore] = useState("todos");
  const [filtroEstagio, setFiltroEstagio] = useState("todos");

  // Drag and drop
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [sobreStageId, setSobreStageId] = useState<string | null>(null);
  const [sobreLeadId, setSobreLeadId] = useState<string | null>(null);
  const [salvandoMovimento, setSalvandoMovimento] = useState<number>(0);
  const leadsAnterior = useRef<LeadCrm[] | null>(null);
  const arrastouRef = useRef(false);

  // Funis
  const [funis, setFunis] = useState<{ id: string; nome: string }[]>([]);
  const [funilAtual, setFunilAtual] = useState<string>("");
  const funilRef = useRef<string>("");
  const [camposNegocio, setCamposNegocio] = useState<CampoPersonalizado[]>([]);
  const [novoNegocioAberto, setNovoNegocioAberto] = useState(false);
  const [pessoasDaEmpresa, setPessoasDaEmpresa] = useState<{ id: string; nome: string | null; cargo: string | null }[]>([]);
  const [editandoCampos, setEditandoCampos] = useState(false);
  const [rascunhoCampos, setRascunhoCampos] = useState<Record<string, unknown>>({});

  // Detalhe
  const [leadDetalhe, setLeadDetalhe] = useState<LeadCrm | null>(null);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [editandoProbId, setEditandoProbId] = useState<string | null>(null);
  const [probRascunho, setProbRascunho] = useState("");
  const [perdaPendente, setPerdaPendente] = useState<{
    leadId: string;
    stageId: string;
    antesLeadId: string | null;
  } | null>(null);
  const [motivoPerda, setMotivoPerda] = useState<string>("");
  const [motivoPerdaOutro, setMotivoPerdaOutro] = useState("");
  const [historico, setHistorico] = useState<EventoHistorico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [mudandoResponsavel, setMudandoResponsavel] = useState(false);
  const [produtosCadastrados, setProdutosCadastrados] = useState<
    ProdutoCadastro[]
  >([]);

  // Ações em massa
  const [modoMassa, setModoMassa] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [massaStageId, setMassaStageId] = useState("");
  const [processandoMassa, setProcessandoMassa] = useState(false);
  const [modalCadenciaMassa, setModalCadenciaMassa] = useState(false);
  const [cadenciasMassa, setCadenciasMassa] = useState<CadenciaModelo[]>([]);
  const [cadenciaMassaId, setCadenciaMassaId] = useState("");

  // Atividade manual
  const [formAtividade, setFormAtividade] = useState({
    tipo_atividade: "tarefa",
    titulo: "",
    observacao: "",
    data_hora_atividade: "",
  });
  const [salvandoAtividade, setSalvandoAtividade] = useState(false);
  const [editandoAtividadeId, setEditandoAtividadeId] = useState<string | null>(null);

  // Cadência
  const [cadencias, setCadencias] = useState<CadenciaModelo[]>([]);
  const [cadenciaAtiva, setCadenciaAtiva] = useState<CadenciaAtiva | null>(null);
  const [cadenciaSelecionada, setCadenciaSelecionada] = useState("");
  const [aplicandoCadencia, setAplicandoCadencia] = useState(false);

  // Adicionar empresa
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [empresasPick, setEmpresasPick] = useState<EmpresaPick[]>([]);
  const [buscaAdicionar, setBuscaAdicionar] = useState("");
  const [carregandoEmpresasPick, setCarregandoEmpresasPick] = useState(false);
  const [adicionandoEmpresa, setAdicionandoEmpresa] = useState(false);
  const [avisoAdicionar, setAvisoAdicionar] = useState("");

  async function carregarCrm() {
    setErro("");
    try {
      // Funil: o escolhido, o do link (?funil=) ou o último usado neste navegador.
      if (!funilRef.current) {
        let inicial = new URLSearchParams(window.location.search).get("funil") ?? "";
        if (!inicial) {
          try {
            inicial = localStorage.getItem("fp-crm-funil") ?? "";
          } catch {
            inicial = "";
          }
        }
        funilRef.current = inicial;
      }
      const consulta = funilRef.current ? `?funil=${encodeURIComponent(funilRef.current)}` : "";
      const res = await fetch(`/api/crm${consulta}`, { cache: "no-store" });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Falha ao carregar o CRM.");
      }
      const dados = await res.json();
      setFunis(dados.funis ?? []);
      if (dados.funil_atual) {
        funilRef.current = dados.funil_atual;
        setFunilAtual(dados.funil_atual);
      }
      setCamposNegocio(((dados.campos ?? []) as CampoPersonalizado[]).filter((c) => c.entidade === "negocio"));
      setEtagias(dados.stages ?? []);
      setLeads(dados.leads ?? []);
      setMembros(dados.membros ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar o CRM.");
    } finally {
      setCarregando(false);
    }
  }

  function trocarFunil(id: string) {
    if (id === funilRef.current) return;
    funilRef.current = id;
    setFunilAtual(id);
    setLeadDetalhe(null);
    setSelecionados([]);
    try {
      localStorage.setItem("fp-crm-funil", id);
    } catch {
      // sem armazenamento local: só não lembra o funil
    }
    setCarregando(true);
    void carregarCrm();
  }

  /** Salva campos do negócio (título, pessoa, previsão, campos personalizados). */
  async function salvarNegocio(leadId: string, mudancas: Record<string, unknown>) {
    const res = await fetch(`/api/crm/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mudancas),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setErro(d?.erro ?? "Não foi possível salvar o negócio.");
      return false;
    }
    const pessoa =
      "pessoa_id" in mudancas
        ? pessoasDaEmpresa.find((p) => p.id === mudancas.pessoa_id) ?? null
        : undefined;
    const aplicar = (l: LeadCrm): LeadCrm =>
      l.id !== leadId
        ? l
        : {
            ...l,
            ...mudancas,
            ...(pessoa !== undefined
              ? { pessoa: pessoa ? { id: pessoa.id, nome: pessoa.nome, cargo: pessoa.cargo, email: null, telefone: null } : null }
              : {}),
          };
    setLeads((atual) => atual.map(aplicar));
    setLeadDetalhe((atual) => (atual ? aplicar(atual) : atual));
    return true;
  }

  // Pessoas da empresa do negócio aberto (para escolher o contato).
  useEffect(() => {
    if (!leadDetalhe?.company_id) return;
    let vivo = true;
    fetch(`/api/crm/pessoas?organizacao=${leadDetalhe.company_id}`)
      .then((r) => (r.ok ? r.json() : { pessoas: [] }))
      .then((d) => vivo && setPessoasDaEmpresa(d.pessoas ?? []))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [leadDetalhe?.company_id]);

  function entrarModoMassa() {
    setModoMassa(true);
    setSelecionados([]);
  }

  function sairModoMassa() {
    setModoMassa(false);
    setSelecionados([]);
    setMassaStageId("");
  }

  function alternarSelecao(leadId: string) {
    setSelecionados((atual) =>
      atual.includes(leadId)
        ? atual.filter((i) => i !== leadId)
        : [...atual, leadId]
    );
  }

  function selecionarVisiveis() {
    setSelecionados(leadsFiltrados.map((l) => l.id));
  }

  function selecionarTodos() {
    // Só o que está visível com os filtros atuais (evita ação em massa
    // sobre leads que a pessoa não está vendo).
    setSelecionados(leadsFiltrados.map((l) => l.id));
  }

  const alvosSelecionados = () => leads.filter((l) => selecionados.includes(l.id));

  async function moverSelecionados() {
    const stageId = massaStageId;
    const alvos = alvosSelecionados();
    if (!stageId || alvos.length === 0) return;

    setProcessandoMassa(true);

    const operacoes = alvos.map((l, i) => {
      return {
        tipo: "mover" as const,
        leadId: l.id,
        stageId,
        ordenacao: (leadsPorStage.get(stageId) ?? []).length + i,
      };
    });

    try {
      const res = await fetch("/api/crm/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacoes }),
      });
      const dados = await res.json();
      if (!res.ok) {
        throw new Error(dados?.erro ?? "Falha ao mover leads.");
      }
      const falhas: string[] = [];
      for (const r of dados.resultados) {
        if (!r.sucesso) {
          const lead = alvos.find((a) => a.id === (r.operacao as { leadId: string }).leadId);
          if (lead) falhas.push(nomeEmpresa(lead.company));
        }
      }
      if (falhas.length > 0) {
        const falhasStr = falhas.slice(0, 3).join(", ") + (falhas.length > 3 ? "…" : "");
        setErro(`Não movidos: ${falhas.length} (${falhasStr}).`);
        await carregarCrm();
      } else {
        setLeads((atual) =>
          atual.map((x) => {
            const op = operacoes.find((o) => o.leadId === x.id);
            if (op && op.tipo === "mover") return { ...x, stage_id: stageId, ordenacao: op.ordenacao };
            return x;
          })
        );
      }
    } catch {
      setErro("Erro ao mover leads em lote.");
    }

    setProcessandoMassa(false);
    setSelecionados([]);
    setMassaStageId("");
  }

  async function abrirCadenciaMassa() {
    setModalCadenciaMassa(true);
    setCadenciaMassaId("");
    setCadenciasMassa([]);
    try {
      const res = await fetch("/api/crm/cadencia");
      const dados = await res.json().catch(() => null);
      setCadenciasMassa(dados?.cadencias ?? []);
    } catch {
      setCadenciasMassa([]);
    }
  }

  async function aplicarCadenciaMassa() {
    const cadenciaId = cadenciaMassaId;
    const alvos = alvosSelecionados();
    if (!cadenciaId || alvos.length === 0) return;

    setProcessandoMassa(true);
    const falhas: string[] = [];

    const operacoes = alvos.map((l) => ({
      tipo: "cadencia" as const,
      leadPipelineId: l.id,
      cadenciaId,
    }));

    try {
      const res = await fetch("/api/crm/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacoes }),
      });
      const dados = await res.json();
      if (!res.ok) {
        throw new Error(dados?.erro ?? "Falha ao aplicar cadência em lote.");
      }
      const falhas: string[] = [];
      for (const r of dados.resultados) {
        if (!r.sucesso) {
          const lead = alvos.find((a) => a.id === (r.operacao as { leadPipelineId: string }).leadPipelineId);
          if (lead) falhas.push(nomeEmpresa(lead.company));
        }
      }
      if (falhas.length > 0) {
        const falhasStr = falhas.slice(0, 3).join(", ") + (falhas.length > 3 ? "…" : "");
        setErro(`Cadência não aplicada em ${falhas.length} (${falhasStr}).`);
      }
      // Atualiza a "próxima atividade" dos cards.
      await carregarCrm();
    } catch {
      setErro("Erro ao aplicar cadência em lote.");
    }

    setProcessandoMassa(false);
    setModalCadenciaMassa(false);
    setCadenciasMassa([]);
    setCadenciaMassaId("");
    setSelecionados([]);
  }

  async function excluirSelecionados() {
    const alvos = alvosSelecionados();
    if (alvos.length === 0) return;
    if (
      !window.confirm(
        `Remover ${alvos.length} lead${
          alvos.length === 1 ? "" : "s"
        } do pipeline? Essa ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    setProcessandoMassa(true);

    const operacoes = alvos.map((l) => ({
      tipo: "excluir" as const,
      leadId: l.id,
    }));

    try {
      const res = await fetch("/api/crm/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacoes }),
      });
      const dados = await res.json();
      if (!res.ok) {
        throw new Error(dados?.erro ?? "Falha ao remover leads em lote.");
      }

      const removidos: string[] = [];
      const falhas: string[] = [];
      for (const r of dados.resultados ?? []) {
        if (r.sucesso) {
          removidos.push(r.operacao.leadId);
        } else {
          const lead = alvos.find((a) => a.id === r.operacao.leadId);
          if (lead) falhas.push(nomeEmpresa(lead.company));
        }
      }

      if (removidos.length > 0) {
        setLeads((atual) => atual.filter((x) => !removidos.includes(x.id)));
        setLeadDetalhe(null);
        setSelecionados((atual) => atual.filter((i) => !removidos.includes(i)));
      }
      if (falhas.length > 0) {
        setErro(
          `Não removidos: ${falhas.length} (${falhas.slice(0, 3).join(", ")}${
            falhas.length > 3 ? "…" : ""
          }).`
        );
      } else if (removidos.length === 0) {
        setSelecionados([]);
      }
    } catch {
      setErro("Erro ao remover leads em lote.");
      setSelecionados([]);
    }

    setProcessandoMassa(false);
  }

  useEffect(() => {
    (async () => {
      const supabase = criarClienteSupabase();
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: dadosPerfil } = await supabase
        .from("perfil")
        .select("nome_empresa, produtos_servicos, foto_url, nichos, anexos, site, area_atuacao")
        .eq("usuario_id", user.id)
        .maybeSingle();
      setPerfil((dadosPerfil as PerfilVendedor) ?? null);

      const { data: dadosCreditos } = await supabase
        .from("creditos")
        .select("saldo")
        .eq("usuario_id", user.id)
        .maybeSingle();
      setSaldoCreditos(dadosCreditos?.saldo ?? null);

      await carregarCrm();

      try {
        const resProdutos = await fetch("/api/produtos");
        if (resProdutos.ok) {
          const dadosProdutos = await resProdutos.json();
          setProdutosCadastrados(dadosProdutos.produtos ?? []);
        }
      } catch {
        // Sem produtos cadastrados, o select fica apenas com "Sem produto".
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const mapaStage = useMemo(() => {
    const m = new Map<string, Estagio>();
    for (const s of etagias) m.set(s.id, s);
    return m;
  }, [etagias]);

  const mapaMembro = useMemo(() => {
    const m = new Map<string, MembroOrg>();
    for (const mb of membros) m.set(mb.usuario_id, mb);
    return m;
  }, [membros]);

  const nomeResponsavel = (lead: LeadCrm): string | null => {
    if (lead.responsavel?.nome) return lead.responsavel.nome;
    if (lead.responsavel?.email) return lead.responsavel.email;
    return null;
  };

  // ---- Filtros ----
  const leadsFiltrados = useMemo(() => {
    const texto = filtroTextoDebounced.trim().toLowerCase();
    return leads.filter((l) => {
      if (filtroEstagio !== "todos" && l.stage_id !== filtroEstagio) return false;
      if (filtroResponsavel !== "todos") {
        if (filtroResponsavel === "sem") {
          if (l.responsavel_id) return false;
        } else if (l.responsavel_id !== filtroResponsavel) {
          return false;
        }
      }
      if (filtroScore === "alto" && (l.company?.score ?? 0) < 80) return false;
      if (filtroScore === "medio" && ((l.company?.score ?? 0) < 50 || (l.company?.score ?? 0) >= 80))
        return false;
      if (filtroScore === "baixo" && (l.company?.score ?? 100) >= 50) return false;
      if (texto) {
        const campos = [
          l.company?.nome_fantasia,
          l.company?.razao_social,
          l.company?.cnpj,
          l.company?.segmento_icp,
          nomePessoa(l),
          cargoPessoa(l),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!campos.includes(texto)) return false;
      }
      return true;
    });
  }, [leads, filtroTextoDebounced, filtroResponsavel, filtroScore, filtroEstagio]);

  const leadsPorStage = useMemo(() => {
    const m = new Map<string, LeadCrm[]>();
    for (const s of etagias) m.set(s.id, []);
    for (const l of leadsFiltrados) {
      const arr = m.get(l.stage_id) ?? [];
      arr.push(l);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => a.ordenacao - b.ordenacao || a.criado_em.localeCompare(b.criado_em));
    }
    return m;
  }, [etagias, leadsFiltrados]);

  const totalFiltrado = leadsFiltrados.length;

  async function buscarHistorico(lead: LeadCrm) {
    setCarregandoHistorico(true);
    try {
      const supabase = criarClienteSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("pipeline_historico")
        .select("id, tipo_evento, dados, stage_origem_id, stage_destino_id, usuario_id, criado_em")
        .eq("company_id", lead.company_id)
        .order("criado_em", { ascending: false })
        .limit(200);
      setHistorico((data as EventoHistorico[]) ?? []);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  async function carregarCadencias(lead: LeadCrm) {
    try {
      const res = await fetch(`/api/crm/cadencia?lead_pipeline_id=${lead.id}`);
      const dados = await res.json().catch(() => null);
      if (dados?.cadencias) setCadencias(dados.cadencias);
      setCadenciaAtiva(dados?.cadenciaAtiva ?? null);
      setCadenciaSelecionada(dados?.cadenciaAtiva?.cadencia_id ?? "");
    } catch {
      // silencioso
    }
  }

  async function buscarInteligencia(lead: LeadCrm) {
    setCarregandoInteligencia(true);
    setErroInteligencia("");
    try {
      const res = await fetch(
        `/api/crm/intelligence?company_id=${lead.company_id}`
      );
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        setErroInteligencia(dados?.erro ?? "Não foi possível carregar.");
        setInteligencia(null);
        return;
      }
      setInteligencia(dados as InteligenciaCrm);
    } catch {
      setErroInteligencia("Falha de conexão. Tente novamente.");
      setInteligencia(null);
    } finally {
      setCarregandoInteligencia(false);
    }
  }

  async function gerarInterpretacao() {
    const lead = leadDetalhe;
    if (!lead) return;
    setGerandoInterpretacao(true);
    setErroInteligencia("");
    try {
      const res = await fetch(
        `/api/crm/intelligence?company_id=${lead.company_id}&acao=gerar_interpretacao`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: lead.company_id }),
        }
      );
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        setErroInteligencia(dados?.erro ?? "Falha ao gerar interpretação.");
        return;
      }
      setInteligencia((atual) =>
        atual
          ? { ...atual, interpretacao_ia: dados.interpretacao_ia }
          : atual
      );
    } catch {
      setErroInteligencia("Falha de conexão. Tente novamente.");
    } finally {
      setGerandoInterpretacao(false);
    }
  }

  async function adicionarSinal() {
    const lead = leadDetalhe;
    if (!lead) return;
    if (!sinalForm.descricao.trim()) {
      setErroInteligencia("Descreva o sinal.");
      return;
    }
    setSalvandoSinal(true);
    setErroInteligencia("");
    try {
      const res = await fetch(
        `/api/crm/intelligence?company_id=${lead.company_id}&acao=adicionar_sinal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: lead.company_id,
            tipo: sinalForm.tipo,
            descricao: sinalForm.descricao,
            data: sinalForm.data || undefined,
            fonte: sinalForm.fonte || "manual",
            confianca: sinalForm.confianca,
            relevancia: sinalForm.relevancia,
          }),
        }
      );
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        setErroInteligencia(dados?.erro ?? "Falha ao salvar sinal.");
        return;
      }
      setSinalForm({
        tipo: "outro",
        descricao: "",
        data: "",
        fonte: "manual",
        confianca: 50,
        relevancia: 50,
      });
      await buscarInteligencia(lead);
    } catch {
      setErroInteligencia("Falha de conexão. Tente novamente.");
    } finally {
      setSalvandoSinal(false);
    }
  }

  async function removerSinal(sinalId: string) {
    const lead = leadDetalhe;
    if (!lead) return;
    setErroInteligencia("");
    try {
      const res = await fetch(
        `/api/crm/intelligence?sinal_id=${sinalId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        setErroInteligencia(dados?.erro ?? "Falha ao remover sinal.");
        return;
      }
      await buscarInteligencia(lead);
    } catch {
      setErroInteligencia("Falha de conexão. Tente novamente.");
    }
  }

  function abrirFormularioAtividade(lead: LeadCrm) {
    setEditandoAtividadeId(null);
    setFormAtividade({
      tipo_atividade: "tarefa",
      titulo: "",
      observacao: "",
      data_hora_atividade: "",
    });
    void carregarCadencias(lead);
  }

  async function criarAtividade(companyId: string) {
    if (!formAtividade.titulo.trim()) return;
    setSalvandoAtividade(true);
    try {
      let dataHora = formAtividade.data_hora_atividade;
      if (dataHora) {
        const d = new Date(dataHora);
        if (!Number.isNaN(d.getTime())) dataHora = d.toISOString();
      }
      const res = await fetch("/api/crm/atividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          tipo_atividade: formAtividade.tipo_atividade,
          titulo: formAtividade.titulo,
          observacao: formAtividade.observacao,
          data_hora_atividade: dataHora || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.erro ?? "Falha ao registrar atividade.");
      }
      setFormAtividade({
        tipo_atividade: "tarefa",
        titulo: "",
        observacao: "",
        data_hora_atividade: "",
      });
      const lead = leads.find((l) => l.id === (leadDetalhe?.id ?? ""));
      if (lead) void buscarHistorico(lead);
      void carregarCrm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao registrar atividade.";
      alert(msg);
    } finally {
      setSalvandoAtividade(false);
    }
  }

  function comecarEditarAtividade(ev: EventoHistorico) {
    const dados = ev.dados as Record<string, unknown>;
    setEditandoAtividadeId(ev.id);
    let dataHora = "";
    const iso = dados.data_hora_atividade;
    if (typeof iso === "string" && iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        dataHora = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate()
        )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    setFormAtividade({
      tipo_atividade:
        typeof dados.tipo_atividade === "string" ? dados.tipo_atividade : "tarefa",
      titulo: typeof dados.titulo === "string" ? dados.titulo : "",
      observacao: typeof dados.observacao === "string" ? dados.observacao : "",
      data_hora_atividade: dataHora,
    });
  }

  async function salvarEdicaoAtividade(companyId: string) {
    if (!editandoAtividadeId || !formAtividade.titulo.trim()) return;
    setSalvandoAtividade(true);
    try {
      let dataHora = formAtividade.data_hora_atividade;
      if (dataHora) {
        const d = new Date(dataHora);
        if (!Number.isNaN(d.getTime())) dataHora = d.toISOString();
      }
      const res = await fetch("/api/crm/atividades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atividade_id: editandoAtividadeId,
          tipo_atividade: formAtividade.tipo_atividade,
          titulo: formAtividade.titulo,
          observacao: formAtividade.observacao,
          data_hora_atividade: dataHora || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.erro ?? "Falha ao editar atividade.");
      }
      setEditandoAtividadeId(null);
      setFormAtividade({
        tipo_atividade: "tarefa",
        titulo: "",
        observacao: "",
        data_hora_atividade: "",
      });
      const lead = leads.find((l) => l.id === (leadDetalhe?.id ?? ""));
      if (lead) void buscarHistorico(lead);
      void carregarCrm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao editar atividade.";
      alert(msg);
    } finally {
      setSalvandoAtividade(false);
    }
  }

  async function removerAtividade(ev: EventoHistorico) {
    if (!confirm("Remover esta atividade?")) return;
    try {
      const res = await fetch("/api/crm/atividades", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atividade_id: ev.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.erro ?? "Falha ao remover atividade.");
      }
      const lead = leads.find((l) => l.id === (leadDetalhe?.id ?? ""));
      if (lead) void buscarHistorico(lead);
      void carregarCrm();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao remover atividade.";
      alert(msg);
    }
  }

  async function aplicarCadencia(companyId: string) {
    if (!cadenciaSelecionada) return;
    setAplicandoCadencia(true);
    try {
      const res = await fetch("/api/crm/cadencia?acao=entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          cadencia_id: cadenciaSelecionada,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.erro ?? "Falha ao aplicar cadência.");
      }
      const lead = leads.find((l) => l.id === (leadDetalhe?.id ?? ""));
      if (lead) {
        void buscarHistorico(lead);
        void carregarCadencias(lead);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao aplicar cadência.";
      alert(msg);
    } finally {
      setAplicandoCadencia(false);
    }
  }

  async function sairCadencia(companyId: string) {
    if (!confirm("Sair da cadência e cancelar as atividades programadas?")) return;
    setAplicandoCadencia(true);
    try {
      const res = await fetch("/api/crm/cadencia?acao=sair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.erro ?? "Falha ao sair da cadência.");
      }
      const lead = leads.find((l) => l.id === (leadDetalhe?.id ?? ""));
      if (lead) {
        void buscarHistorico(lead);
        void carregarCadencias(lead);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao sair da cadência.";
      alert(msg);
    } finally {
      setAplicandoCadencia(false);
    }
  }

  // ---- Drag and drop ----
  function aoDropEmStage(stageId: string) {
    setSobreLeadId(null);
    if (!arrastandoId) return;
    solicitarMover(arrastandoId, stageId, null);
  }

  function aoDropEmLead(leadAlvo: LeadCrm) {
    if (!arrastandoId || arrastandoId === leadAlvo.id) return;
    solicitarMover(arrastandoId, leadAlvo.stage_id, leadAlvo.id);
  }

  async function moverLead(
    leadId: string,
    stageDestinoId: string,
    antesLeadId: string | null,
    motivoPerdaEscolhido?: string
  ) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (lead.stage_id === stageDestinoId && !antesLeadId) return;

    // Snapshot para rollback
    leadsAnterior.current = leads;

    // Ordem atual do destino (sem o lead movido)
    const destino = (leadsPorStage.get(stageDestinoId) ?? []).filter(
      (l) => l.id !== leadId
    );

    // Calcula nova ordenação do destino com o lead inserido na posição certa
    let ordenacaoNovo: number;
    const destinoNovo: LeadCrm[] = [];
    if (antesLeadId) {
      const idx = destino.findIndex((l) => l.id === antesLeadId);
      const posicao = idx === -1 ? destino.length : idx;
      destinoNovo.push(
        ...destino.slice(0, posicao).map((l, i) => ({ ...l, ordenacao: i })),
        {
          ...lead,
          stage_id: stageDestinoId,
          ordenacao: posicao,
        } as LeadCrm,
        ...destino.slice(posicao).map((l, i) => ({
          ...l,
          ordenacao: posicao + 1 + i,
        }))
      );
      ordenacaoNovo = posicao;
    } else {
      destinoNovo.push(
        ...destino.map((l, i) => ({ ...l, ordenacao: i })),
        { ...lead, stage_id: stageDestinoId, ordenacao: destino.length } as LeadCrm
      );
      ordenacaoNovo = destino.length;
    }

    // Atualiza localmente: move o lead e aplica nova ordenação no destino
    setLeads((atual) => {
      const fora = atual.filter((l) => l.id !== leadId);
      const idsDestino = new Set(destinoNovo.map((l) => l.id));
      return [
        ...fora.filter((l) => !idsDestino.has(l.id)),
        ...destinoNovo,
      ];
    });

    setSalvandoMovimento((n) => n + 1);
    setSobreStageId(null);
    setSobreLeadId(null);
    setArrastandoId(null);

    // Atualiza detalhe aberto, se for o caso
    setLeadDetalhe((atual) =>
      atual && atual.id === leadId
        ? { ...atual, stage_id: stageDestinoId, motivo_perda: motivoPerdaEscolhido ?? null }
        : atual
    );
    setLeads((atual) =>
      atual.map((l) => (l.id === leadId ? { ...l, motivo_perda: motivoPerdaEscolhido ?? null } : l))
    );

    try {
      const res = await fetch(`/api/crm/${ledIdEscape(leadId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_id: stageDestinoId,
          stage_origem_id: lead.stage_id,
          ordenacao: ordenacaoNovo,
          ...(motivoPerdaEscolhido ? { motivo_perda: motivoPerdaEscolhido } : {}),
        }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Falha ao mover o lead.");
      }
    } catch (e) {
      if (leadsAnterior.current) setLeads(leadsAnterior.current);
      setErro(e instanceof Error ? e.message : "Falha ao mover o lead.");
    } finally {
      setSalvandoMovimento((n) => n - 1);
      leadsAnterior.current = null;
    }
  }

  function ledIdEscape(id: string): string {
    return encodeURIComponent(id);
  }

  async function mudarResponsavel(lead: LeadCrm, usuarioId: string) {
    setMudandoResponsavel(true);
    try {
      const res = await fetch(`/api/crm/${ledIdEscape(lead.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsavel_id: usuarioId || null }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Falha ao definir responsável.");
      }
      const mb = usuarioId ? mapaMembro.get(usuarioId) : null;
      const novaLead = {
        ...lead,
        responsavel_id: usuarioId || null,
        responsavel: mb ? { nome: mb.nome, email: mb.email } : null,
      };
      setLeads((atual) => atual.map((l) => (l.id === lead.id ? novaLead : l)));
      setLeadDetalhe(novaLead);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao definir responsável.");
    } finally {
      setMudandoResponsavel(false);
    }
  }

  async function mudarOportunidade(
    lead: LeadCrm,
    campos: {
      valor_oportunidade?: number | null;
      produto?: string | null;
    }
  ) {
    const novaLead = { ...lead, ...campos };
    setLeads((atual) => atual.map((l) => (l.id === lead.id ? novaLead : l)));
    setLeadDetalhe(novaLead);
    try {
      const res = await fetch(`/api/crm/${ledIdEscape(lead.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campos),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Falha ao salvar oportunidade.");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar oportunidade.");
      setLeads((atual) => atual.map((l) => (l.id === lead.id ? lead : l)));
      setLeadDetalhe(lead);
    }
  }

  async function removerDoPipeline(lead: LeadCrm) {
    if (!confirm(`Remover "${nomeEmpresa(lead.company)}" do pipeline?`)) return;
    try {
      const res = await fetch(`/api/crm/${ledIdEscape(lead.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Falha ao remover do pipeline.");
      }
      setLeads((atual) => atual.filter((l) => l.id !== lead.id));
      setLeadDetalhe(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover do pipeline.");
    }
  }

  // ---- Adicionar empresa ----
  async function abrirAdicionar() {
    setModalAdicionarAberto(true);
    setBuscaAdicionar("");
    setAvisoAdicionar("");
    setCarregandoEmpresasPick(true);
    try {
      const supabase = criarClienteSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("companies")
        .select("id, razao_social, nome_fantasia, cnpj, segmento_icp, municipio, uf, score")
        .order("criado_em", { ascending: false })
        .limit(500);
      const idsNoPipeline = new Set(leads.map((l) => l.company_id));
      setEmpresasPick(
        ((data as EmpresaPick[]) ?? []).filter((e) => !idsNoPipeline.has(e.id))
      );
    } finally {
      setCarregandoEmpresasPick(false);
    }
  }

  const empresasAdicionar = useMemo(() => {
    const t = buscaAdicionar.trim().toLowerCase();
    if (!t) return empresasPick;
    return empresasPick.filter((e) =>
      [e.nome_fantasia, e.razao_social, e.cnpj, e.segmento_icp, e.municipio, e.uf]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [empresasPick, buscaAdicionar]);

  async function adicionarEmpresa(empresa: EmpresaPick) {
    setAdicionandoEmpresa(true);
    setAvisoAdicionar("");
    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: empresa.id, pipeline_id: funilRef.current || undefined }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Falha ao adicionar ao pipeline.");
      }
      setEmpresasPick((atual) => atual.filter((e) => e.id !== empresa.id));
      await carregarCrm();
      setAvisoAdicionar(`"${nomeEmpresa(empresa)}" adicionado ao pipeline.`);
    } catch (e) {
      setAvisoAdicionar(e instanceof Error ? e.message : "Falha ao adicionar.");
    } finally {
      setAdicionandoEmpresa(false);
    }
  }

  // Papel do usuário (só admin ajusta a probabilidade dos estágios).
  useEffect(() => {
    fetch("/api/org")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEhAdmin(d?.papel === "admin"))
      .catch(() => {});
  }, []);

  const moeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  // Previsão: valor em aberto, valor ponderado pela chance de cada estágio e valor ganho.
  const previsao = useMemo(() => {
    const porStage = new Map(etagias.map((e) => [e.id, e]));
    let aberto = 0;
    let ponderado = 0;
    let ganho = 0;
    for (const l of leads) {
      const v = l.valor_oportunidade ?? 0;
      if (!v) continue;
      const st = porStage.get(l.stage_id);
      if (!st) continue;
      if (ehEstagioGanho(st.nome)) ganho += v;
      else if (!ehEstagioPerdido(st.nome)) {
        aberto += v;
        ponderado += (v * probabilidadeDoEstagio(st)) / 100;
      }
    }
    return { aberto, ponderado, ganho };
  }, [leads, etagias]);

  async function salvarProbabilidade(stage: Estagio) {
    const n = Math.round(Number(probRascunho));
    setEditandoProbId(null);
    if (!Number.isFinite(n) || n < 0 || n > 100 || n === probabilidadeDoEstagio(stage)) return;
    const anterior = etagias;
    setEtagias((atual) => atual.map((e) => (e.id === stage.id ? { ...e, probabilidade: n } : e)));
    const res = await fetch("/api/crm/estagios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stage.id, probabilidade: n }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setEtagias(anterior);
      setErro("Não foi possível salvar a probabilidade do estágio.");
    }
  }

  /** Mover para "Perdido" pede o motivo antes; os demais estágios movem direto. */
  function solicitarMover(leadId: string, stageDestinoId: string, antesLeadId: string | null) {
    const destino = etagias.find((e) => e.id === stageDestinoId);
    const lead = leads.find((l) => l.id === leadId);
    if (destino && lead && ehEstagioPerdido(destino.nome) && lead.stage_id !== stageDestinoId) {
      setSobreStageId(null);
      setSobreLeadId(null);
      setArrastandoId(null);
      setMotivoPerda("");
      setMotivoPerdaOutro("");
      setPerdaPendente({ leadId, stageId: stageDestinoId, antesLeadId });
      return;
    }
    void moverLead(leadId, stageDestinoId, antesLeadId);
  }

  function confirmarPerda() {
    if (!perdaPendente) return;
    const motivo = motivoPerda === "Outro" ? motivoPerdaOutro.trim() || "Outro" : motivoPerda;
    if (!motivo) return;
    const p = perdaPendente;
    setPerdaPendente(null);
    void moverLead(p.leadId, p.stageId, p.antesLeadId, motivo);
  }

  // Esc fecha o painel do lead.
  useEffect(() => {
    if (!leadDetalhe) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeadDetalhe(null);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [leadDetalhe]);

  // Link direto para um lead (ex.: vindo da tela Hoje): /crm?empresa=<company_id>
  const abriuPorLinkRef = useRef(false);
  useEffect(() => {
    if (abriuPorLinkRef.current || leads.length === 0) return;
    const alvo = new URLSearchParams(window.location.search).get("empresa");
    if (!alvo) return;
    const lead = leads.find((l) => l.company_id === alvo);
    if (!lead) return;
    abriuPorLinkRef.current = true;
    const id = setTimeout(() => abrirDetalhe(lead), 0);
    return () => clearTimeout(id);
    // abrirDetalhe é estável o suficiente para este uso único.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  // ---- Detalhe ----
  function abrirDetalhe(lead: LeadCrm) {
    setEditandoCampos(false);
    setLeadDetalhe(lead);
    setHistorico([]);
    setInteligencia(null);
    setErroInteligencia("");
    setSinalForm({
      tipo: "outro",
      descricao: "",
      data: "",
      fonte: "manual",
      confianca: 50,
      relevancia: 50,
    });
    void buscarHistorico(lead);
    void buscarInteligencia(lead);
    abrirFormularioAtividade(lead);
  }

  async function concluirAtividadeDoCard(lead: LeadCrm) {
    const ativ = lead.proxima_atividade;
    if (!ativ) return;
    try {
      const res = await fetch("/api/crm/atividades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atividade_id: ativ.id, concluida: true }),
      });
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Não foi possível concluir a atividade.");
      }
      await carregarCrm();
      const detalhe = leadDetalhe;
      if (detalhe && detalhe.company_id === lead.company_id) {
        setHistorico([]);
        void buscarHistorico(detalhe);
}
     } catch (e) {
       setErro(e instanceof Error ? e.message : "Falha ao concluir atividade.");
     }
   }



return (
    <>
      <Sidebar
        perfil={perfil}
        saldoCreditos={saldoCreditos}
        aoAbrirPerfil={() => setModalPerfilAberto(true)}
      />

      <ModalPerfil
        key={`perfil-crm-${modalPerfilAberto}`}
        aberto={modalPerfilAberto}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={setPerfil}
      />

      <main className="min-h-screen bg-pipe-bg px-6 py-8 lg:pl-72">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-5">
          <AbasCrm />
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-medium tracking-[-0.03em] text-pipe-ink">
                  Negócios
                </h1>
                {funis.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-pipe-muted">
                    <span className="sr-only">Funil</span>
                    <select
                      value={funilAtual}
                      onChange={(e) => {
                        if (e.target.value === "__gerenciar") router.push("/crm/configuracoes");
                        else trocarFunil(e.target.value);
                      }}
                      className="rounded-full border border-pipe-border bg-white px-3 py-1.5 text-sm font-medium text-pipe-ink focus:border-pipe-blue focus:outline-none"
                    >
                      {funis.map((f) => (
                        <option key={f.id} value={f.id}>
                          Funil: {f.nome}
                        </option>
                      ))}
                      <option value="__gerenciar">Gerenciar funis…</option>
                    </select>
                  </label>
                )}
              </div>
              <p className="text-sm text-pipe-muted mt-0.5">
                Pipeline comercial B2B · {totalFiltrado} lead
                {totalFiltrado === 1 ? "" : "s"}
                {salvandoMovimento > 0 ? " · salvando…" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={modoMassa ? sairModoMassa : entrarModoMassa}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  modoMassa
                    ? "bg-pipe-lime text-white hover:brightness-110"
                    : "bg-pipe-card border border-pipe-border text-pipe-ink hover:border-pipe-blue/50"
                }`}
              >
                {modoMassa ? "Sair da seleção" : "Selecionar em massa"}
              </button>
              <button
                onClick={abrirAdicionar}
                className="bg-pipe-card border border-pipe-border text-pipe-ink font-semibold px-4 py-2.5 rounded-xl text-sm hover:border-pipe-blue/50 transition"
              >
                Trazer das listas
              </button>
              <button
                onClick={() => setNovoNegocioAberto(true)}
                className="bg-pipe-ink text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-black transition"
              >
                + Negócio
              </button>
            </div>
          </div>

          {/* Previsão de receita */}
          <dl className="grid grid-cols-1 overflow-hidden rounded-2xl border border-pipe-border bg-pipe-card sm:grid-cols-3">
            {[
              { rotulo: "Em negociação", valor: previsao.aberto, dica: "Soma das oportunidades abertas" },
              {
                rotulo: "Previsão ponderada",
                valor: previsao.ponderado,
                dica: "Valor × chance de fechar de cada etapa",
                destaque: true,
              },
              { rotulo: "Ganho", valor: previsao.ganho, dica: "Oportunidades na etapa Ganho" },
            ].map((c, i) => (
              <div key={c.rotulo} className={`px-5 py-4 ${i > 0 ? "border-t border-pipe-border sm:border-l sm:border-t-0" : ""}`}>
                <dt className="text-xs text-pipe-muted">{c.rotulo}</dt>
                <dd className={`mt-1 text-2xl font-medium tracking-[-0.02em] tabular-nums ${c.destaque ? "text-pipe-blue" : "text-pipe-ink"}`}>
                  {moeda(c.valor)}
                </dd>
                <dd className="mt-0.5 text-xs text-pipe-muted">{c.dica}</dd>
              </div>
            ))}
          </dl>

          {/* Filtros */}
          <div className="bg-pipe-card border border-pipe-border rounded-2xl p-3 flex flex-wrap items-center gap-3">
            <input
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar empresa, contato, cargo…"
              className="flex-1 min-w-[200px] bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:outline-none focus:border-pipe-blue"
            />
            <select
              value={filtroEstagio}
              onChange={(e) => setFiltroEstagio(e.target.value)}
              className="bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
            >
              <option value="todos">Todos os estágios</option>
              {etagias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className="bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
            >
              <option value="todos">Todos os responsáveis</option>
              <option value="sem">Sem responsável</option>
              {membros.map((m) => (
                <option key={m.usuario_id} value={m.usuario_id}>
                  {m.nome || m.email || "Membro"}
                </option>
              ))}
            </select>
            <select
              value={filtroScore}
              onChange={(e) => setFiltroScore(e.target.value)}
              className="bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
            >
              <option value="todos">Todos os scores</option>
              <option value="alto">Score alto (80+)</option>
              <option value="medio">Score médio (50–79)</option>
              <option value="baixo">Score baixo (&lt;50)</option>
            </select>
            {erro && (
              <p className="w-full text-sm text-red-700">{erro}</p>
            )}
          </div>

          {/* Ações em massa */}
          {modoMassa && (
            <div className="bg-pipe-card border border-dashed border-pipe-lime/40 rounded-2xl p-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-pipe-ink">
                {selecionados.length} selecionado
                {selecionados.length === 1 ? "" : "s"}
              </span>
              <button
                onClick={selecionarVisiveis}
                className="text-xs text-pipe-muted hover:text-pipe-ink transition"
              >
                Selecionar visíveis ({totalFiltrado})
              </button>
              <button
                onClick={selecionarTodos}
                className="text-xs text-pipe-muted hover:text-pipe-ink transition"
              >
                Selecionar todo o kanban
              </button>
              <span className="w-px h-5 bg-pipe-border hidden sm:block" />
              <select
                value={massaStageId}
                onChange={(e) => setMassaStageId(e.target.value)}
                className="bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
              >
                <option value="">Mover para estágio…</option>
                {etagias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
              <button
                onClick={moverSelecionados}
                disabled={
                  !massaStageId || selecionados.length === 0 || processandoMassa
                }
                className="bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink font-semibold hover:border-pipe-blue/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Mover
              </button>
              <button
                onClick={abrirCadenciaMassa}
                disabled={selecionados.length === 0 || processandoMassa}
                className="bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink font-semibold hover:border-pipe-blue/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Aplicar cadência
              </button>
              <button
                onClick={excluirSelecionados}
                disabled={selecionados.length === 0 || processandoMassa}
                className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-700 font-semibold hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Excluir
              </button>
              {processandoMassa && (
                <span className="text-xs text-pipe-muted">salvando…</span>
              )}
              <button
                onClick={sairModoMassa}
                className="ml-auto text-xs text-pipe-muted hover:text-pipe-ink transition"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Modal cadência em massa */}
          {modalCadenciaMassa && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
              <div className="bg-pipe-card border border-pipe-border rounded-2xl p-5 w-full max-w-md">
                <h3 className="font-display text-lg text-pipe-ink">
                  Aplicar cadência
                </h3>
                <p className="text-sm text-pipe-muted mt-1">
                  Escolha o modelo que será aplicado a{" "}
                  {selecionados.length} lead
                  {selecionados.length === 1 ? "" : "s"}.
                </p>
                {cadenciasMassa.length === 0 ? (
                  <p className="text-sm text-pipe-muted mt-4">
                    Nenhuma cadência criada ainda. Crie um modelo para aplicar
                    em massa.
                  </p>
                ) : (
                  <select
                    value={cadenciaMassaId}
                    onChange={(e) => setCadenciaMassaId(e.target.value)}
                    className="mt-4 w-full bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
                  >
                    <option value="">Escolher cadência…</option>
                    {cadenciasMassa.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex justify-end gap-2 mt-5">
                  <button
                    onClick={() => setModalCadenciaMassa(false)}
                    className="px-4 py-2 rounded-xl text-sm text-pipe-muted hover:text-pipe-ink transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={aplicarCadenciaMassa}
                    disabled={!cadenciaMassaId || processandoMassa}
                    className="bg-pipe-lime text-white font-semibold px-4 py-2 rounded-xl text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {carregando ? (
            <div className="flex items-center justify-center py-24 text-pipe-muted">
              Carregando pipeline…
            </div>
          ) : etagias.length === 0 ? (
            <div className="bg-pipe-card border border-pipe-border rounded-2xl p-10 text-center text-pipe-muted">
              Nenhum estágio configurado ainda.
            </div>
          ) : (
            /* Kanban */
            <div className="flex gap-4 overflow-x-auto pb-4 items-start">
              {etagias.map((stage) => {
                const cards = leadsPorStage.get(stage.id) ?? [];
                const sobre = sobreStageId === stage.id;
                return (
                  <div
                    key={stage.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setSobreStageId(stage.id);
                    }}
                    onDragLeave={() => setSobreStageId((a) => (a === stage.id ? null : a))}
                    onDrop={(e) => {
                      e.preventDefault();
                      aoDropEmStage(stage.id);
                    }}
                    className={`w-[300px] shrink-0 rounded-2xl border transition ${
                      sobre
                        ? "border-pipe-lime bg-pipe-lime/5"
                        : "border-transparent bg-[#ebe9e3]/70"
                    }`}
                  >
                    <div
                      className="px-4 py-3 flex items-center justify-between"
                      style={{ borderTop: `3px solid ${stage.cor}` }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: stage.cor }}
                        />
                        <p className="text-sm font-semibold text-pipe-ink truncate">
                          {stage.nome}
                        </p>
                      </div>
                      <span className="text-xs text-pipe-muted shrink-0">
                        {cards.length}
                      </span>
                    </div>
                    <div className="px-4 -mt-1 pb-2.5 flex items-center justify-between text-[11px] text-pipe-muted">
                      <span className="tabular-nums">
                        {moeda(cards.reduce((t, l) => t + (l.valor_oportunidade ?? 0), 0))}
                      </span>
                      {editandoProbId === stage.id ? (
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={100}
                          value={probRascunho}
                          onChange={(e) => setProbRascunho(e.target.value)}
                          onBlur={() => void salvarProbabilidade(stage)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void salvarProbabilidade(stage);
                            if (e.key === "Escape") setEditandoProbId(null);
                          }}
                          aria-label={`Chance de fechar em ${stage.nome} (%)`}
                          className="w-14 rounded-md border border-pipe-blue bg-white px-1.5 py-0.5 text-right text-[11px] text-pipe-ink focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={!ehAdmin}
                          onClick={() => {
                            setProbRascunho(String(probabilidadeDoEstagio(stage)));
                            setEditandoProbId(stage.id);
                          }}
                          title={ehAdmin ? "Chance de fechar nesta etapa (clique para ajustar)" : "Chance de fechar nesta etapa"}
                          className="tabular-nums rounded-md px-1 enabled:hover:bg-white enabled:hover:text-pipe-ink"
                        >
                          {probabilidadeDoEstagio(stage)}% de chance
                        </button>
                      )}
                    </div>

                    <div className="px-2.5 pb-2.5 flex flex-col gap-2 min-h-[160px]">
                      {cards.length === 0 ? (
                        <div className="text-center text-xs text-pipe-muted py-8 rounded-lg border border-dashed border-pipe-border">
                          Solte aqui
                        </div>
                      ) : (
                        cards.map((l) => (
                          <div
                            key={l.id}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSobreLeadId(l.id);
                              setSobreStageId(stage.id);
                            }}
                            onDragLeave={() =>
                              setSobreLeadId((a) => (a === l.id ? null : a))
                            }
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              aoDropEmLead(l);
                            }}
                          >
                            <LeadCard
  lead={l}
  modoMassa={modoMassa}
  selecionados={selecionados}
  arrastandoId={arrastandoId}
  sobreStageId={sobreStageId}
  sobreLeadId={sobreLeadId}
  arrastouRef={arrastouRef}
  setArrastandoId={setArrastandoId}
  setSobreStageId={setSobreStageId}
  setSobreLeadId={setSobreLeadId}
  onConcluirAtividade={concluirAtividadeDoCard}
  onAbrirDetalhe={abrirDetalhe}
  onAlternarSelecao={alternarSelecao}
/>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal adicionar empresa */}
      {modalAdicionarAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setModalAdicionarAberto(false)}
        >
          <div
            className="bg-pipe-card border border-pipe-border rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-pipe-border flex items-center justify-between">
              <h2 className="font-display text-xl text-pipe-ink">Adicionar ao pipeline</h2>
              <button
                onClick={() => setModalAdicionarAberto(false)}
                className="text-pipe-muted hover:text-pipe-ink text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 border-b border-pipe-border">
              <input
                autoFocus
                value={buscaAdicionar}
                onChange={(e) => setBuscaAdicionar(e.target.value)}
                placeholder="Buscar nas suas empresas…"
                className="w-full bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:outline-none focus:border-pipe-blue"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
              {carregandoEmpresasPick ? (
                <p className="text-center text-pipe-muted py-8 text-sm">
                  Carregando empresas…
                </p>
              ) : empresasAdicionar.length === 0 ? (
                <p className="text-center text-pipe-muted py-8 text-sm">
                  {buscaAdicionar
                    ? "Nenhuma empresa encontrada."
                    : "Você ainda não tem empresas geradas. Crie uma prospecção primeiro."}
                </p>
              ) : (
                empresasAdicionar.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 bg-pipe-bg border border-pipe-border rounded-xl p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-pipe-ink truncate">
                        {nomeEmpresa(e)}
                      </p>
                      <p className="text-xs text-pipe-muted truncate">
                        {[
                          e.segmento_icp,
                          e.municipio ? `${e.municipio}${e.uf ? `-${e.uf}` : ""}` : null,
                          e.cnpj ? formatarCnpj(e.cnpj) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {e.score !== null && e.score !== undefined ? (
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${corScore(e.score)}`}>
                          {e.score}
                        </span>
                      ) : null}
                      <button
                        onClick={() => adicionarEmpresa(e)}
                        disabled={adicionandoEmpresa}
                        className="bg-pipe-blue/15 text-pipe-blue border border-pipe-blue/30 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-pipe-blue/25 disabled:opacity-50 transition"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                ))
              )}
              {avisoAdicionar && (
                <p className="text-sm text-pipe-lime pt-1">{avisoAdicionar}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <NovoNegocio
        key={`novo-negocio-${novoNegocioAberto}`}
        aberto={novoNegocioAberto}
        funilInicial={funilAtual || null}
        aoFechar={() => setNovoNegocioAberto(false)}
        aoCriar={(n) => {
          setNovoNegocioAberto(false);
          if (n.pipeline_id !== funilRef.current) trocarFunil(n.pipeline_id);
          else void carregarCrm();
        }}
      />

      {/* Motivo de perda */}
      {perdaPendente && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111114]/30 p-4"
          onClick={() => setPerdaPendente(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-perda"
            className="w-full max-w-md rounded-2xl border border-pipe-border bg-pipe-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="titulo-perda" className="text-xl font-medium tracking-[-0.02em] text-pipe-ink">
              Por que essa venda foi perdida?
            </h2>
            <p className="mt-1 text-sm text-pipe-muted">
              {nomeEmpresa(leads.find((l) => l.id === perdaPendente.leadId)?.company ?? null)} · o motivo entra nos relatórios.
            </p>
            <div className="mt-5 grid gap-2">
              {MOTIVOS_PERDA.map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    motivoPerda === m ? "border-pipe-ink bg-pipe-bg text-pipe-ink" : "border-pipe-border text-pipe-ink-soft hover:border-pipe-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo-perda"
                    value={m}
                    checked={motivoPerda === m}
                    onChange={() => setMotivoPerda(m)}
                    className="accent-pipe-blue"
                  />
                  {m}
                </label>
              ))}
              {motivoPerda === "Outro" && (
                <input
                  autoFocus
                  value={motivoPerdaOutro}
                  onChange={(e) => setMotivoPerdaOutro(e.target.value)}
                  maxLength={300}
                  placeholder="Conte em poucas palavras"
                  className="w-full rounded-xl border border-pipe-border bg-white px-3.5 py-2.5 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
                />
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPerdaPendente(null)}
                className="rounded-full px-4 py-2.5 text-sm text-pipe-ink-soft hover:text-pipe-ink"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPerda}
                disabled={!motivoPerda || (motivoPerda === "Outro" && !motivoPerdaOutro.trim())}
                className="rounded-full bg-pipe-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                Marcar como perdido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel lateral do lead (o funil continua visível ao lado) */}
      {leadDetalhe && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#111114]/20"
          onClick={() => setLeadDetalhe(null)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do lead"
            className="painel-lateral-entrar h-full w-full max-w-[680px] bg-pipe-card border-l border-pipe-border shadow-[-24px_0_60px_-30px_rgba(17,17,20,0.35)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-pipe-border flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-2xl font-medium tracking-[-0.02em] text-pipe-ink break-words">
                  {leadDetalhe.company_inconsistente
                    ? "Dados da empresa indisponíveis"
                    : nomeEmpresa(leadDetalhe.company)}
                </h2>
                <p className="text-xs text-pipe-muted mt-0.5">
                  {leadDetalhe.company?.cnpj
                    ? `${formatarCnpj(leadDetalhe.company.cnpj)} · `
                    : ""}
                  {leadDetalhe.company?.segmento_icp || "Sem segmento"}
                  {leadDetalhe.company_id && (
                    <>
                      {" · "}
                      <Link href={`/crm/organizacoes/${leadDetalhe.company_id}`} className="text-pipe-blue hover:underline">
                        Ver organização
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setLeadDetalhe(null)}
                aria-label="Fechar"
                className="w-9 h-9 rounded-full border border-pipe-border text-pipe-muted hover:text-pipe-ink hover:border-pipe-ink/30 text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {leadDetalhe.company_inconsistente && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 rounded-xl px-4 py-3 text-sm">
                  Dados da empresa indisponíveis: este lead referencia uma
                  empresa não encontrada na sua organização. Verifique a
                  origem/empresa deste lead antes de prosseguir.
                </div>
              )}

              {/* Negócio: título, pessoa de contato, previsão e campos personalizados */}
              <section className="rounded-xl border border-pipe-border p-4 space-y-4">
                <div>
                  <label htmlFor="negocio-titulo" className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted">
                    Título do negócio
                  </label>
                  <input
                    id="negocio-titulo"
                    key={`titulo-${leadDetalhe.id}`}
                    defaultValue={leadDetalhe.titulo ?? ""}
                    placeholder={`Negócio ${nomeEmpresa(leadDetalhe.company)}`}
                    onBlur={(e) => {
                      const novo = e.target.value.trim();
                      if (novo !== (leadDetalhe.titulo ?? "")) void salvarNegocio(leadDetalhe.id, { titulo: novo || null });
                    }}
                    className="mt-1.5 w-full rounded-lg border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="negocio-pessoa" className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted">
                      Pessoa de contato
                    </label>
                    <select
                      id="negocio-pessoa"
                      value={leadDetalhe.pessoa_id ?? ""}
                      onChange={(e) => void salvarNegocio(leadDetalhe.id, { pessoa_id: e.target.value || null })}
                      className="mt-1.5 w-full rounded-lg border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
                    >
                      <option value="">{pessoasDaEmpresa.length ? "Nenhuma" : "Nenhuma pessoa cadastrada"}</option>
                      {pessoasDaEmpresa.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome ?? "Sem nome"}
                          {p.cargo ? ` · ${p.cargo}` : ""}
                        </option>
                      ))}
                    </select>
                    {pessoasDaEmpresa.length === 0 && (
                      <Link href={`/crm/organizacoes/${leadDetalhe.company_id}`} className="mt-1 inline-block text-xs text-pipe-blue hover:underline">
                        Cadastrar pessoa
                      </Link>
                    )}
                  </div>
                  <div>
                    <label htmlFor="negocio-data" className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted">
                      Previsão de fechamento
                    </label>
                    <input
                      id="negocio-data"
                      type="date"
                      value={leadDetalhe.data_prevista ?? ""}
                      onChange={(e) => void salvarNegocio(leadDetalhe.id, { data_prevista: e.target.value || null })}
                      className="mt-1.5 w-full rounded-lg border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
                    />
                  </div>
                </div>
                {camposNegocio.length > 0 && (
                  <div className="border-t border-pipe-border pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted">Campos personalizados</p>
                      {editandoCampos ? (
                        <span className="flex gap-3 text-sm">
                          <button onClick={() => setEditandoCampos(false)} className="text-pipe-muted hover:text-pipe-ink">
                            Cancelar
                          </button>
                          <button
                            onClick={() =>
                              void salvarNegocio(leadDetalhe.id, { campos: rascunhoCampos }).then((ok) => ok && setEditandoCampos(false))
                            }
                            className="font-medium text-pipe-blue hover:underline"
                          >
                            Salvar
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setRascunhoCampos({ ...(leadDetalhe.campos ?? {}) });
                            setEditandoCampos(true);
                          }}
                          className="text-sm text-pipe-blue hover:underline"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    <BlocoCampos
                      campos={camposNegocio}
                      valores={leadDetalhe.campos ?? {}}
                      editando={editandoCampos}
                      rascunho={rascunhoCampos}
                      aoMudarRascunho={setRascunhoCampos}
                    />
                  </div>
                )}
              </section>

              {/* Estágio e responsável */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-1.5">
                    Estágio
                  </p>
                  <select
                    value={leadDetalhe.stage_id}
                    onChange={(e) => {
                      const novoStage = e.target.value;
                      solicitarMover(leadDetalhe.id, novoStage, null);
                    }}
                    className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
                  >
                    {etagias.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                  {leadDetalhe.motivo_perda &&
                    ehEstagioPerdido(etagias.find((e) => e.id === leadDetalhe.stage_id)?.nome) && (
                      <p className="mt-2 text-xs text-red-700">Motivo da perda: {leadDetalhe.motivo_perda}</p>
                    )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-1.5">
                    Responsável
                  </p>
                  <select
                    value={leadDetalhe.responsavel_id ?? ""}
                    disabled={mudandoResponsavel}
                    onChange={(e) =>
                      void mudarResponsavel(leadDetalhe, e.target.value)
                    }
                    className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue disabled:opacity-50"
                  >
                    <option value="">Sem responsável</option>
                    {membros.map((m) => (
                      <option key={m.usuario_id} value={m.usuario_id}>
                        {m.nome || m.email || "Membro"}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Oportunidade */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-1.5">
                    Valor da oportunidade (R$)
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex.: 15000"
                    value={leadDetalhe.valor_oportunidade ?? ""}
                    onChange={(e) =>
                      void mudarOportunidade(leadDetalhe, {
                        valor_oportunidade:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:outline-none focus:border-pipe-blue"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-1.5">
                    Produto / serviço
                  </p>
                  <select
                    value={
                      leadDetalhe.produto &&
                      produtosCadastrados.some(
                        (p) => p.nome === leadDetalhe.produto
                      )
                        ? leadDetalhe.produto
                        : ""
                    }
                    onChange={(e) =>
                      void mudarOportunidade(leadDetalhe, {
                        produto: e.target.value === "" ? null : e.target.value,
                      })
                    }
                    className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
                  >
                    <option value="">Sem produto</option>
                    {produtosCadastrados.map((p) => (
                      <option key={p.id} value={p.nome}>
                        {p.nome}
                      </option>
                    ))}
                    {leadDetalhe.produto &&
                      !produtosCadastrados.some(
                        (p) => p.nome === leadDetalhe.produto
                      ) && (
                        <option value={leadDetalhe.produto}>
                          {leadDetalhe.produto}
                        </option>
                      )}
                  </select>
                  {produtosCadastrados.length === 0 && (
                    <p className="mt-1 text-[11px] text-pipe-muted">
                      Cadastre seus produtos na aba{" "}
                      <Link
                        href="/produtos"
                        className="text-pipe-blue hover:underline"
                      >
                        Produtos
                      </Link>{" "}
                      para padronizar este campo.
                    </p>
                  )}
                </div>
              </section>

              {/* Score */}
              {leadDetalhe.company?.score !== null &&
                leadDetalhe.company?.score !== undefined && (
                  <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-1">
                      ICP Fit
                    </p>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-lg font-semibold px-2.5 py-1 rounded-lg ${corScore(
                          leadDetalhe.company.score
                        )}`}
                      >
                        {leadDetalhe.company.score}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${
                          leadDetalhe.prioridade?.nivel === "alta"
                            ? "bg-red-500/15 text-red-700"
                            : leadDetalhe.prioridade?.nivel === "media"
                              ? "bg-yellow-500/15 text-amber-700"
                              : "bg-gray-500/20 text-pipe-ink-soft"
                        }`}
                      >
                        {leadDetalhe.prioridade?.rotulo}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-pipe-muted mb-1">
                          Pontos fortes
                        </p>
                        {leadDetalhe.prioridade?.fatoresPositivos?.length ? (
                          <ul className="space-y-0.5">
                            {leadDetalhe.prioridade.fatoresPositivos.map(
                              (f, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-pipe-lime flex gap-1.5"
                                >
                                  <span className="shrink-0">+</span>
                                  <span>{f}</span>
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p className="text-xs text-pipe-muted">
                            — dados insuficientes
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-pipe-muted mb-1">
                          Pontos fracos
                        </p>
                        {leadDetalhe.prioridade?.fatoresNegativos?.length ? (
                          <ul className="space-y-0.5">
                            {leadDetalhe.prioridade.fatoresNegativos.map(
                              (f, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-amber-700 flex gap-1.5"
                                >
                                  <span className="shrink-0">−</span>
                                  <span>{f}</span>
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p className="text-xs text-pipe-muted">—</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-pipe-muted mb-1 mt-3">
                      Por que prospectar?
                    </p>
                    {leadDetalhe.prioridade?.dadosInsuficientes ? (
                      <p className="text-xs text-pipe-muted">
                        Dados insuficientes para uma recomendação confiável.
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {leadDetalhe.prioridade?.motivos?.map((m, i) => (
                          <li
                            key={i}
                            className="text-xs text-pipe-ink-soft flex gap-1.5"
                          >
                            <span className="shrink-0">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {leadDetalhe.company.score_motivo && (
                      <p className="text-xs text-pipe-muted mt-2">
                        {leadDetalhe.company.score_motivo}
                      </p>
                    )}
                  </section>
                )}

              {/* Empresa */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-2">
                  Empresa
                </p>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-pipe-muted w-32 shrink-0">Razão social</dt>
                    <dd className="text-pipe-ink-soft">
                      {leadDetalhe.company?.razao_social || "—"}
                    </dd>
                  </div>
                  {(leadDetalhe.company?.decisor_nome ||
                    leadDetalhe.company?.campeao_nome) && (
                    <div className="flex gap-2">
                      <dt className="text-pipe-muted w-32 shrink-0">
                        Sócio / responsável
                      </dt>
                      <dd className="text-pipe-ink-soft">
                        {leadDetalhe.company.decisor_nome ||
                          leadDetalhe.company.campeao_nome}
                        {(leadDetalhe.company.decisor_cargo ||
                          leadDetalhe.company.campeao_cargo) && (
                          <span className="text-pipe-muted">
                            {" "}·{" "}
                            {leadDetalhe.company.decisor_cargo ||
                              leadDetalhe.company.campeao_cargo}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="text-pipe-muted w-32 shrink-0">Localização</dt>
                    <dd className="text-pipe-ink-soft">
                      {[leadDetalhe.company?.municipio, leadDetalhe.company?.uf]
                        .filter(Boolean)
                        .join(" - ") || "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-pipe-muted w-32 shrink-0">Origem</dt>
                    <dd className="text-pipe-ink-soft">{leadDetalhe.company?.origem || "—"}</dd>
                  </div>
                  {leadDetalhe.company?.endereco && (
                    <div className="flex gap-2">
                      <dt className="text-pipe-muted w-32 shrink-0">Endereço</dt>
                      <dd className="text-pipe-ink-soft">{leadDetalhe.company.endereco}</dd>
                    </div>
                  )}
                </dl>

                {(leadDetalhe.company?.telefone ||
                  leadDetalhe.company?.email ||
                  leadDetalhe.company?.linkedin) && (
                  <div className="flex flex-col gap-1.5 text-sm mt-3">
                    {leadDetalhe.company.telefone ? (
                      <a
                        href={`tel:${leadDetalhe.company.telefone.replace(/\D/g, "")}`}
                        className="text-pipe-blue hover:underline inline-flex items-center gap-1.5"
                      >
                        <IconeTelefone tamanho={14} className="shrink-0" />
                        {leadDetalhe.company.telefone}
                      </a>
                    ) : null}
                    {leadDetalhe.company.email ? (
                      <a
                        href={`mailto:${leadDetalhe.company.email}`}
                        className="text-pipe-blue hover:underline break-all inline-flex items-center gap-1.5"
                      >
                        <IconeEmail tamanho={14} className="shrink-0" />
                        {leadDetalhe.company.email}
                      </a>
                    ) : null}
                    {leadDetalhe.company.linkedin ? (
                      <a
                        href={leadDetalhe.company.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pipe-blue hover:underline break-all"
                      >
                        LinkedIn da empresa →
                      </a>
                    ) : leadDetalhe.company.razao_social ? (
                      <a
                        href={gerarLinkBuscaEmpresa(
                          leadDetalhe.company.nome_fantasia,
                          leadDetalhe.company.razao_social
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pipe-blue hover:underline"
                      >
                        Buscar empresa no LinkedIn →
                      </a>
                    ) : null}
                  </div>
                )}
              </section>

              {/* Company Intelligence */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-3">
                  Inteligência da empresa
                </p>

                {carregandoInteligencia ? (
                  <p className="text-sm text-pipe-muted">
                    Carregando inteligência…
                  </p>
                ) : erroInteligencia ? (
                  <p className="text-sm text-red-700">{erroInteligencia}</p>
                ) : !inteligencia ? (
                  <p className="text-sm text-pipe-muted">
                    Nenhum dado consolidado disponível.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {/* Interpretação comercial (IA) */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-xs font-semibold text-pipe-muted">
                          Interpretação comercial
                        </p>
                        <button
                          onClick={() => void gerarInterpretacao()}
                          disabled={gerandoInterpretacao}
                          className="text-xs font-semibold text-pipe-lime hover:underline disabled:opacity-50"
                        >
                          {gerandoInterpretacao
                            ? "Gerando…"
                            : inteligencia.interpretacao_ia
                              ? "Regenerar · 1 crédito"
                              : "Gerar · 1 crédito"}
                        </button>
                      </div>
                      {inteligencia.interpretacao_ia ? (
                        <p className="text-sm text-pipe-ink-soft leading-relaxed bg-pipe-dark border border-pipe-border rounded-lg p-3">
                          {inteligencia.interpretacao_ia}
                        </p>
                      ) : (
                        <p className="text-xs text-pipe-muted">
                          Sem interpretação gerada ainda.{" "}
                          <span className="text-pipe-muted">
                            A análise usa apenas os dados reais da empresa.
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Mapa de decisores */}
                    <div>
                      <p className="text-xs font-semibold text-pipe-muted mb-2">
                        Decisores ({inteligencia.decisores.length})
                      </p>
                      {inteligencia.decisores.length === 0 ? (
                        <p className="text-xs text-pipe-muted">
                          Nenhum decisor mapeado para esta empresa.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {inteligencia.decisores.map((d, i) => (
                            <div
                              key={i}
                              className="flex items-start justify-between gap-2 bg-pipe-dark border border-pipe-border rounded-lg p-2.5"
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-pipe-ink font-medium truncate">
                                  {d.nome}
                                  {d.cargo ? (
                                    <span className="text-pipe-muted font-normal">
                                      {" "}· {d.cargo}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-[11px] text-pipe-muted mt-0.5 space-x-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md ${
                                      d.papel === "decisor"
                                        ? "bg-pipe-lime/15 text-pipe-lime"
                                        : d.papel === "campeao"
                                          ? "bg-pipe-blue/15 text-pipe-blue"
                                          : d.papel === "aprovador"
                                            ? "bg-purple-500/15 text-purple-700"
                                            : d.papel === "influenciador"
                                              ? "bg-yellow-500/15 text-amber-700"
                                              : "bg-gray-500/20 text-pipe-ink-soft"
                                    }`}
                                  >
                                    {d.rotulo}
                                  </span>
                                  {d.inferido && (
                                    <span className="text-pipe-muted">
                                      (inferido do cargo)
                                    </span>
                                  )}
                                </p>
                                {(d.email || d.telefone || d.linkedin) && (
                                  <p className="text-[11px] text-pipe-blue mt-1 space-x-2">
                                    {d.email ? (
                                      <a
                                        href={`mailto:${d.email}`}
                                        className="hover:underline"
                                      >
                                        {d.email}
                                      </a>
                                    ) : null}
                                    {d.telefone ? (
                                      <a
                                        href={`tel:${d.telefone.replace(/\D/g, "")}`}
                                        className="hover:underline"
                                      >
                                        {d.telefone}
                                      </a>
                                    ) : null}
                                    {d.linkedin ? (
                                      <a
                                        href={d.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                      >
                                        LinkedIn
                                      </a>
                                    ) : null}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fatos cadastrais (dados reais) */}
                    {inteligencia.fatos_cadastrais.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-pipe-muted mb-1.5">
                          Fatos cadastrais
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {inteligencia.fatos_cadastrais.map((f, i) => (
                            <span
                              key={i}
                              className="text-[11px] text-pipe-ink-soft bg-pipe-dark border border-pipe-border rounded-md px-2 py-1"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sinais comerciais */}
                    <div>
                      <p className="text-xs font-semibold text-pipe-muted mb-2">
                        Sinais comerciais ({inteligencia.sinais.length})
                      </p>
                      {inteligencia.sinais.length === 0 ? (
                        <p className="text-xs text-pipe-muted mb-2">
                          Nenhum sinal registrado. Registre um evento comercial.
                        </p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {inteligencia.sinais.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-start justify-between gap-2 bg-pipe-dark border border-pipe-border rounded-lg p-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-pipe-ink font-medium">
                                  {ROTULO_TIPO_SINAL[s.tipo] ?? s.tipo}
                                  {s.data ? (
                                    <span className="text-pipe-muted font-normal">
                                      {" "}· {s.data}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-[11px] text-pipe-ink-soft mt-0.5">
                                  {s.descricao}
                                </p>
                                <p className="text-[10px] text-pipe-muted mt-0.5">
                                  {s.fonte} · confiança {s.confianca} · relevância{" "}
                                  {s.relevancia}
                                </p>
                              </div>
                              <button
                                onClick={() => void removerSinal(s.id)}
                                title="Remover sinal"
                                className="text-[11px] text-red-700 hover:text-red-700 shrink-0"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulário novo sinal */}
                      <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={sinalForm.tipo}
                            onChange={(e) =>
                              setSinalForm((f) => ({
                                ...f,
                                tipo: e.target.value,
                              }))
                            }
                            className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-1.5 text-xs text-pipe-ink"
                          >
                            {(inteligencia.tipos_sinal ?? [
                              "contratacao",
                              "expansao",
                              "nova_filial",
                              "mudanca_lideranca",
                              "novo_decisor",
                              "tecnologia",
                              "crescimento",
                              "evento",
                              "outro",
                            ]).map((t) => (
                              <option key={t} value={t}>
                                {ROTULO_TIPO_SINAL[t] ?? t}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={sinalForm.data}
                            onChange={(e) =>
                              setSinalForm((f) => ({
                                ...f,
                                data: e.target.value,
                              }))
                            }
                            className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-1.5 text-xs text-pipe-ink"
                          />
                        </div>
                        <input
                          value={sinalForm.descricao}
                          onChange={(e) =>
                            setSinalForm((f) => ({
                              ...f,
                              descricao: e.target.value,
                            }))
                          }
                          placeholder="Descreva o sinal (ex.: contratou 3 executivos)"
                          className="w-full bg-pipe-bg border border-pipe-border rounded-lg px-2 py-1.5 text-xs text-pipe-ink placeholder:text-pipe-muted/70"
                        />
                        <button
                          onClick={() => void adicionarSinal()}
                          disabled={salvandoSinal}
                          className="text-xs font-semibold bg-pipe-lime text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                        >
                          {salvandoSinal ? "Salvando…" : "+ Registro de sinal"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Contato prioritário */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-2">
                  Contato prioritário
                </p>
                <p className="text-pipe-ink-soft font-semibold">{nomePessoa(leadDetalhe)}</p>
                {cargoPessoa(leadDetalhe) && (
                  <p className="text-sm text-pipe-muted">{cargoPessoa(leadDetalhe)}</p>
                )}
                {leadDetalhe.company?.razao_social && (
                  <a
                    href={gerarLinkBuscaPessoas(
                      cargoPessoa(leadDetalhe) || "Comprador",
                      leadDetalhe.company.nome_fantasia,
                      leadDetalhe.company.razao_social
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pipe-blue hover:underline text-sm mt-1 inline-block"
                  >
                    Buscar no LinkedIn →
                  </a>
                )}
              </section>

              {/* Cadência */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-3">
                  Cadência
                </p>
                {cadenciaAtiva ? (
                  <div className="space-y-2">
                    <p className="text-sm text-pipe-ink font-medium">
                      {cadencias.find((c) => c.id === cadenciaAtiva.cadencia_id)
                        ?.nome ?? "Cadência ativa"}
                    </p>
                    <p className="text-[11px] text-pipe-muted">
                      {cadenciaAtiva.status === "concluida"
                        ? "Cadência concluída: todas as etapas foram feitas."
                        : cadenciaAtiva.proxima_em
                          ? `Próxima etapa: ${formatarData(cadenciaAtiva.proxima_em)}`
                          : "Sem próxima etapa."}
                    </p>
                    <button
                      onClick={() =>
                        void sairCadencia(leadDetalhe.company_id)
                      }
                      disabled={aplicandoCadencia}
                      className="bg-red-500/10 text-red-700 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      Sair da cadência
                    </button>
                  </div>
                ) : cadencias.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={cadenciaSelecionada}
                      onChange={(e) => setCadenciaSelecionada(e.target.value)}
                      className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
                    >
                      <option value="">Selecione uma cadência…</option>
                      {cadencias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.etapas.length} toques)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void aplicarCadencia(leadDetalhe.company_id)}
                      disabled={!cadenciaSelecionada || aplicandoCadencia}
                      className="w-full bg-pipe-lime/15 text-pipe-lime border border-pipe-lime/30 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-pipe-lime/25 transition disabled:opacity-50"
                    >
                      Aplicar cadência
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-pipe-muted">
                    Nenhuma cadência disponível.
                  </p>
                )}
              </section>

              {/* Registrar atividade */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-3">
                  {editandoAtividadeId
                    ? "Editar atividade"
                    : "Registrar atividade"}
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={formAtividade.tipo_atividade}
                      onChange={(e) =>
                        setFormAtividade((f) => ({
                          ...f,
                          tipo_atividade: e.target.value,
                        }))
                      }
                      className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
                    >
                      {TIPOS_ATIVIDADE.map((t) => (
                        <option key={t} value={t}>
                          {ROTULO_TIPO_ATIVIDADE[t] ?? t}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={formAtividade.data_hora_atividade}
                      onChange={(e) =>
                        setFormAtividade((f) => ({
                          ...f,
                          data_hora_atividade: e.target.value,
                        }))
                      }
                      className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink focus:outline-none focus:border-pipe-blue"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Título da atividade (ex.: E-mail de apresentação)"
                    value={formAtividade.titulo}
                    onChange={(e) =>
                      setFormAtividade((f) => ({ ...f, titulo: e.target.value }))
                    }
                    className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:outline-none focus:border-pipe-blue"
                  />
                  <textarea
                    placeholder="Observações / notas"
                    value={formAtividade.observacao}
                    onChange={(e) =>
                      setFormAtividade((f) => ({
                        ...f,
                        observacao: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:outline-none focus:border-pipe-blue"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        editandoAtividadeId
                          ? void salvarEdicaoAtividade(leadDetalhe.company_id)
                          : void criarAtividade(leadDetalhe.company_id)
                      }
                      disabled={
                        salvandoAtividade || !formAtividade.titulo.trim()
                      }
                      className="bg-pipe-lime/15 text-pipe-lime border border-pipe-lime/30 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-pipe-lime/25 transition disabled:opacity-50"
                    >
                      {editandoAtividadeId ? "Salvar alterações" : "Registrar"}
                    </button>
                    {editandoAtividadeId && (
                      <button
                        onClick={() => {
                          setEditandoAtividadeId(null);
                          setFormAtividade({
                            tipo_atividade: "tarefa",
                            titulo: "",
                            observacao: "",
                            data_hora_atividade: "",
                          });
                        }}
                        className="bg-pipe-card border border-pipe-border px-4 py-2 rounded-lg text-xs font-semibold text-pipe-muted hover:text-pipe-ink transition"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Histórico */}
              <section className="bg-pipe-bg border border-pipe-border rounded-xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted mb-3">
                  Histórico
                </p>
                {carregandoHistorico ? (
                  <p className="text-sm text-pipe-muted">Carregando histórico…</p>
                ) : historico.length === 0 ? (
                  <p className="text-sm text-pipe-muted">
                    Nenhum histórico ainda.
                  </p>
                ) : (
                  <ol className="relative border-l border-pipe-border ml-2 space-y-4">
                    {historico.map((h) => {
                      const origem = h.stage_origem_id
                        ? mapaStage.get(h.stage_origem_id)?.nome ?? null
                        : null;
                      const destino = h.stage_destino_id
                        ? mapaStage.get(h.stage_destino_id)?.nome ?? null
                        : null;
                      const autor = h.usuario_id
                        ? mapaMembro.get(h.usuario_id)
                        : null;
                      const d = (h.dados ?? {}) as Record<string, unknown>;
                      const ehAtividade =
                        h.tipo_evento === "atividade" ||
                        h.tipo_evento === "atividade_programada";
                      const cancelada = d.cancelada === true;
                      const dataAtividade =
                        typeof d.data_hora_atividade === "string"
                          ? d.data_hora_atividade
                          : null;
                      return (
                        <li key={h.id} className="relative pl-6">
                          <span
                            className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full ${
                              ehAtividade
                                ? cancelada
                                  ? "bg-pipe-muted"
                                  : "bg-pipe-lime"
                                : "bg-pipe-blue"
                            }`}
                          />
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-pipe-ink font-medium">
                              {ROTULO_EVENTO[h.tipo_evento] ?? h.tipo_evento}
                              {typeof d.tipo_atividade === "string" &&
                                d.tipo_atividade &&
                                h.tipo_evento !== "cadencia_iniciada" && (
                                  <span className="text-pipe-muted font-normal">
                                    {" · "}
                                    {ROTULO_TIPO_ATIVIDADE[d.tipo_atividade] ??
                                      d.tipo_atividade}
                                  </span>
                                )}
                            </p>
                            {h.tipo_evento === "atividade" && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => comecarEditarAtividade(h)}
                                  className="text-[11px] text-pipe-muted hover:text-pipe-ink"
                                  title="Editar"
                                >
                                  editar
                                </button>
                                <button
                                  onClick={() => void removerAtividade(h)}
                                  className="text-[11px] text-pipe-muted hover:text-red-700"
                                  title="Remover"
                                >
                                  remover
                                </button>
                              </div>
                            )}
                          </div>
                          {typeof d.titulo === "string" && d.titulo && (
                            <p className="text-sm text-pipe-ink-soft">{d.titulo}</p>
                          )}
                          {h.tipo_evento === "mudanca_estagio" &&
                            origem &&
                            destino && (
                              <p className="text-xs text-pipe-muted">
                                {origem} → {destino}
                              </p>
                            )}
                          {typeof d.observacao === "string" &&
                            d.observacao && (
                              <p className="text-xs text-pipe-muted whitespace-pre-wrap">
                                {d.observacao}
                              </p>
                            )}
                          <p className="text-[11px] text-pipe-muted mt-0.5">
                            {dataAtividade && ehAtividade
                              ? `Programado: ${formatarData(dataAtividade)}`
                              : formatarData(h.criado_em)}
                            {autor
                              ? ` · ${autor.nome || autor.email || "Membro"}`
                              : ""}
                            {cancelada && (
                              <span className="text-pipe-muted ml-1">
                                (cancelada)
                              </span>
                            )}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              {/* Ações */}
              <section className="flex gap-2">
                <button
                  onClick={() => void removerDoPipeline(leadDetalhe)}
                  className="bg-red-500/10 text-red-700 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition"
                >
                  Remover do pipeline
                </button>
              </section>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
