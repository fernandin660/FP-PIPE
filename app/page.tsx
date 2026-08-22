"use client";

import { useEffect, useRef, useState } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";
import AuthModal from "../components/AuthModal";
import TelaEntrada from "../components/TelaEntrada";
import ModalCompraCreditos from "../components/ModalCompraCreditos";
import PopEspera from "../components/PopEspera";
import ModalLeadManual, {
  type LeadManual,
} from "../components/ModalLeadManual";
import ModalEditarPessoas, {
  type DadosPessoas,
} from "../components/ModalEditarPessoas";
import ModalPerfil, {
  type PerfilVendedor,
} from "../components/ModalPerfil";
import Sidebar from "../components/Sidebar";
import {
  CATALOGO_CARGOS,
  buscarCargos,
  normalizarCargo,
  ordenarPorAutoridade,
  rotuloNivel,
} from "../lib/conhecimento-cargos";
import { formatarCnpj } from "../lib/conhecimento-cnae";
import { baixarCsv } from "../lib/exportar-csv";
import {
  gerarLinkBuscaEmpresa,
  gerarLinkBuscaPessoas,
  limparNomeEmpresa,
} from "../lib/linkedin-links";

const estadosBrasil = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

// Segmentos baseados na taxonomia de indústrias do LinkedIn

const CONTATOS_BLOQUEADOS = true;

function formatarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 11)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return telefone;
}

const segmentosDisponiveis = [
  "Agronegócio e Agricultura",
  "Alimentos e Bebidas",
  "Automotivo",
  "Construção Civil",
  "Consultoria",
  "E-commerce",
  "Educação",
  "Energia e Utilities",
  "Farmacêutica",
  "Governo e Setor Público",
  "Hotelaria e Turismo",
  "Imobiliário",
  "Indústria Química",
  "Jurídico",
  "Logística e Transporte",
  "Manufatura",
  "Mídia e Marketing",
  "Mineração",
  "ONGs e Terceiro Setor",
  "Papel e Celulose",
  "Petróleo e Gás",
  "Saúde e Hospitais",
  "Seguros",
  "Serviços Financeiros",
  "Tecnologia e Software",
  "Telecomunicações",
  "Têxtil e Moda",
  "Varejo",
];

const passosLanding = [
  {
    titulo: "Conte sobre sua empresa",
    descricao:
      "Área de atuação, produtos e serviços e até o site da sua empresa. Nossa equipe analisa tudo.",
  },
  {
    titulo: "Defina o cliente ideal",
    descricao:
      "Porte, quantidade de funcionários, localização e segmentos de mercado no padrão LinkedIn.",
  },
  {
    titulo: "Receba seu ICP completo",
    descricao:
      "Mais de 10 tipos de empresa ideal, decisores e influenciadores separados, dores e estratégia de abordagem.",
  },
  {
    titulo: "Materiais prontos para vender",
    descricao:
      "E-mail personalizado para cada empresa: gancho do segmento, nome do decisor e copia-e-cola pronto.",
  },
];

const entregaveis = [
  {
    titulo: "Perfil de Cliente Ideal",
    descricao: "Resumo executivo do seu mercado-alvo, pronto para guiar a operação.",
  },
  {
    titulo: "10+ tipos de empresa ideal",
    descricao: "Empresas concretas que existem no segmento, não categorias genéricas.",
  },
  {
    titulo: "Decisores x Influenciadores",
    descricao: "Quem assina o contrato e quem recomenda a compra, separados por papel.",
  },
  {
    titulo: "Dores do mercado",
    descricao: "O que realmente dói no seu cliente e abre portas na conversa.",
  },
  {
    titulo: "E-mail de prospecção",
    descricao: "No modelo validado em campo, com ponto de conexão e chamada para reunião.",
  },
  {
    titulo: "E-mail personalizado por empresa",
    descricao: "Cada lead da lista recebe um primeiro e-mail pronto: gancho do segmento, nome da empresa e do decisor.",
  },
];

type IcpGerado = {
  resumo_icp?: string;
  tipos_de_empresa?: string[];
  decisores?: string[];
  influenciadores?: string[];
  principais_dores?: string[];
  estrategia_abordagem?: string;
  email_prospeccao?: {
    assunto?: string;
    mensagem?: string;
  };
};

export default function Home() {
  // =========================
  // CONTROLE DE TELAS
  // =========================

  const [tela, setTela] = useState<"landing" | "app">("landing");

  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [empresasDesbloqueadas, setEmpresasDesbloqueadas] =
    useState<Set<string>>(new Set());
  const [modalCompraAberto, setModalCompraAberto] = useState(false);
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  async function carregarPerfil(usuarioId: string) {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from("perfil")
        .select(
          "nome_empresa, area_atuacao, produtos_servicos, site, foto_url, anexos, nichos"
        )
        .eq("usuario_id", usuarioId)
        .maybeSingle();

      if (data) setPerfil(data as PerfilVendedor);

      const atual = (data as PerfilVendedor | null) ?? null;

      if (!atual?.produtos_servicos) {
        Promise.resolve().then(() => setModalPerfilAberto(true));
      }
    } catch (erroPerfil) {
      console.error("Erro ao carregar perfil:", erroPerfil);
    }
  }

  async function carregarSaldo(usuarioId: string) {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from("creditos")
        .select("saldo")
        .eq("usuario_id", usuarioId)
        .maybeSingle();

      if (!data) {
        await supabase
          .from("creditos")
          .insert({ usuario_id: usuarioId, saldo: 5 });
        setSaldoCreditos(5);
        return;
      }

      setSaldoCreditos(data.saldo);
    } catch {
      setSaldoCreditos(0);
    }
  }

  useEffect(() => {
    const supabase = criarClienteSupabase();
    if (!supabase) {
      Promise.resolve().then(() => setCarregandoAuth(false));
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUsuarioEmail(data.user?.email ?? null);
      if (data.user) {
        carregarSaldo(data.user.id);
        carregarPerfil(data.user.id);
      }
      setCarregandoAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setUsuarioEmail(sessao?.user?.email ?? null);

      if (_evento === "SIGNED_IN" && sessao?.user) {
        carregarSaldo(sessao.user.id);
        carregarPerfil(sessao.user.id);
        setTela("app");
        window.scrollTo({ top: 0 });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const salvarLeadManual = async (lead: LeadManual) => {
    const digitos = lead.cnpj.replace(/\D/g, "");

    const novoLead = {
      cnpj: digitos,
      cnpjFormatado: digitos.length === 14 ? formatarCnpj(digitos) : "—",
      razaoSocial: lead.razaoSocial,
      nomeFantasia: "",
      segmentoIcp: "Lead manual",
      uf: "",
      municipio: "",
      score: null as number | null,
      motivo: null as string | null,
      telefone: lead.telefone || null,
      email: lead.email || null,
      linkedin: lead.linkedin || null,
      origem: "manual" as const,
    };

    setEmpresasEncontradas((atual) => [novoLead, ...atual]);
    setModalLeadAberto(false);

    try {
      const supabase = criarClienteSupabase();

      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase.from("companies").upsert(
            {
              usuario_id: user.id,
              cnpj: digitos || null,
              razao_social: lead.razaoSocial,
              nome_fantasia: "",
              situacao_cadastral: "ATIVA",
              segmento_icp: segmentosSelecionados[0] ?? null,
              telefone: lead.telefone || null,
              email: lead.email || null,
              linkedin: lead.linkedin || null,
              fonte: "manual",
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: "usuario_id,cnpj" }
          );
        }
      }
    } catch (erroLeadManual) {
      console.error("Erro ao salvar lead manual:", erroLeadManual);
    }
  };

  const desbloquearEmpresa = async (cnpj: string) => {
    if ((saldoCreditos ?? 0) <= 0) {
      setModalCompraAberto(true);
      return;
    }

    const novoSaldo = (saldoCreditos ?? 0) - 1;
    setSaldoCreditos(novoSaldo);
    setEmpresasDesbloqueadas((atual) => new Set(atual).add(cnpj));

    const supabase = criarClienteSupabase();
    if (supabase) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from("creditos")
            .update({
              saldo: novoSaldo,
              atualizado_em: new Date().toISOString(),
            })
            .eq("usuario_id", user.id);
        }
      } catch (erroDebito) {
        console.error("Erro ao debitar crédito:", erroDebito);
      }
    }
  };

  async function sairDaConta() {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    await supabase.auth.signOut();
    setUsuarioEmail(null);
  }

  const iniciarApp = () => {
    setTela("app");
    window.scrollTo({ top: 0 });
  };

  const irParaLanding = () => {
    setTela("landing");
    window.scrollTo({ top: 0 });
  };

  // =========================
  // CONTROLE DAS ETAPAS
  // =========================

  const [etapa, setEtapa] = useState(1);

  // =========================
  // ETAPA 1
  // =========================

  const [tipoCliente] = useState("B2B");

  const [porteEmpresa, setPorteEmpresa] = useState<string[]>([]);

  const [faixaFuncionarios, setFaixaFuncionarios] = useState<string[]>([]);

  const [tipoLocalizacao, setTipoLocalizacao] = useState("");
  const [estadoSelecionado, setEstadoSelecionado] = useState("");
  const [cidade, setCidade] = useState("");

  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);

  // =========================
  // ICP GERADO
  // =========================

  const [icpGerado, setIcpGerado] = useState<IcpGerado | null>(null);
  const [gerandoICP, setGerandoICP] = useState(false);

  const [copiado, setCopiado] = useState("");

  // =========================
  // DESCOBERTA DE EMPRESAS
  // =========================

  const [buscandoEmpresas, setBuscandoEmpresas] = useState(false);
  const [empresasEncontradas, setEmpresasEncontradas] = useState<
    Array<{
      cnpj: string;
      cnpjFormatado: string;
      razaoSocial: string;
      nomeFantasia: string;
      segmentoIcp: string;
      uf: string;
      municipio: string;
      capitalSocial?: number | null;
      porte?: string | null;
      endereco?: string | null;
      score?: number | null;
      motivo?: string | null;
      telefone?: string | null;
      email?: string | null;
      decisorNome?: string | null;
      decisorCargo?: string | null;
      cargoPrioritario?: string | null;
      emailProspeccao?: { assunto: string; mensagem: string } | null;
      linkedin?: string | null;
      origem?: string;
      aprovadorLinkedin?: string | null;
      aprovadorTelefone?: string | null;
      aprovadorEmail?: string | null;
      campeaoNome?: string | null;
      campeaoCargo?: string | null;
      campeaoLinkedin?: string | null;
      campeaoTelefone?: string | null;
      campeaoEmail?: string | null;
      confirmado?: boolean;
    }>
  >([]);
  const [modalLeadAberto, setModalLeadAberto] = useState(false);
  const [cnpjEmEdicao, setCnpjEmEdicao] = useState<string | null>(null);
  const [erroEmpresas, setErroEmpresas] = useState("");
  const [pontuandoEmpresas, setPontuandoEmpresas] = useState(false);
  const [pontuadas, setPontuadas] = useState(false);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<
    Set<string>
  >(new Set());

  const alternarEmpresa = (cnpj: string) => {
    setEmpresasSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(cnpj)) {
        novo.delete(cnpj);
      } else {
        novo.add(cnpj);
      }
      return novo;
    });
  };

  const alternarTodas = () => {
    setEmpresasSelecionadas((atual) =>
      atual.size === empresasEncontradas.length
        ? new Set<string>()
        : new Set(empresasEncontradas.map((e) => e.cnpj))
    );
  };

  const [salvandoLista, setSalvandoLista] = useState(false);
  const [listaJaSalva, setListaJaSalva] = useState(false);

  const salvarListaAtual = async () => {
    if (!usuarioEmail || listaJaSalva || salvandoLista) return;

    const supabase = criarClienteSupabase();
    if (!supabase) return;

    const comScore = empresasEncontradas.filter(
      (e) => typeof e.score === "number" && e.score !== null
    );

    if (comScore.length === 0) {
      alert("Gere e pontue a lista antes de salvar.");
      return;
    }

    setSalvandoLista(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sessão expirada.");

      const nomeLista = `${
        segmentosSelecionados[0] ?? "Leads"
      } · ${
        tipoLocalizacao === "Cidade específica"
          ? cidade
          : tipoLocalizacao === "Estado específico"
            ? estadoSelecionado
            : "Brasil"
      } · ${new Date().toLocaleDateString("pt-BR")}`;

      const { data: listaCriada, error: erroLista } = await supabase
        .from("listas")
        .insert({
          usuario_id: user.id,
          nome: nomeLista,
          segmentos: segmentosSelecionados,
          icp_resumo: icpGerado?.resumo_icp ?? "",
          localizacao:
            tipoLocalizacao === "Cidade específica"
              ? cidade
              : tipoLocalizacao === "Estado específico"
                ? `Estado de ${estadoSelecionado}`
                : "Brasil",
        })
        .select("id")
        .single();

      if (erroLista) throw erroLista;

      if (listaCriada?.id) {
        const { data: linhasEmpresas } = await supabase
          .from("companies")
          .select("id")
          .eq("usuario_id", user.id)
          .in(
            "cnpj",
            comScore.map((e) => e.cnpj)
          );

        if (linhasEmpresas && linhasEmpresas.length > 0) {
          await supabase.from("lista_empresas").insert(
            linhasEmpresas.map((linha) => ({
              lista_id: listaCriada.id,
              company_id: linha.id,
            }))
          );
        }
      }

      setListaJaSalva(true);
    } catch (erroSalvarLista) {
      console.error("Erro ao salvar lista:", erroSalvarLista);
      alert("Não conseguimos salvar a lista agora. Tente novamente.");
    } finally {
      setSalvandoLista(false);
    }
  };

  const exportarCsv = () => {
    const bloqueado = "🔒 Desbloqueie com créditos";

    const liberada = (indice: number, cnpj: string) =>
      !CONTATOS_BLOQUEADOS ||
      indice === 0 ||
      empresasDesbloqueadas.has(cnpj);

    const cabecalho = [
      "Empresa",
      "CNPJ",
      "Endereço",
      "Cidade",
      "UF",
      "Segmento ICP",
      "Porte",
      "Capital Social",
      "Score",
      "Motivo do Score",
      "Telefone Empresa",
      "Email Empresa",
      "LinkedIn Empresa",
      "Aprovador Nome",
      "Aprovador Cargo",
      "Aprovador LinkedIn",
      "Aprovador Telefone",
      "Aprovador Email",
      "Influenciador Nome",
      "Influenciador Cargo",
      "Influenciador LinkedIn",
      "Influenciador Telefone",
      "Influenciador Email",
      "Confirmado",
      "Origem",
    ];

    const linhas = empresasEncontradas.map((e, indice) => {
      if (!liberada(indice, e.cnpj)) {
        return [
          bloqueado,
          e.cnpjFormatado,
          "",
          "",
          "",
          e.segmentoIcp,
          "",
          "",
          e.score ?? "",
          "",
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          bloqueado,
          e.confirmado ? "Sim" : "Nao",
          e.origem === "manual" ? "Manual" : "Busca",
        ];
      }

      return [
        e.razaoSocial,
        e.cnpjFormatado,
        e.endereco ?? "",
        e.municipio,
        e.uf,
        e.segmentoIcp,
        e.porte ?? "",
        e.capitalSocial ?? "",
        e.score ?? "",
        e.motivo ?? "",
        e.telefone ?? "",
        e.email ?? "",
        e.linkedin || gerarLinkBuscaEmpresa(e.nomeFantasia, e.razaoSocial),
        e.decisorNome ?? "",
        e.decisorCargo ?? "",
        e.aprovadorLinkedin ||
          gerarLinkBuscaPessoas(
            e.campeaoCargo || e.cargoPrioritario || "Comprador",
            e.nomeFantasia,
            e.razaoSocial
          ),
        e.aprovadorTelefone ?? "",
        e.aprovadorEmail ?? "",
        e.campeaoNome ?? "",
        e.campeaoCargo ?? e.cargoPrioritario ?? "",
        e.campeaoLinkedin ?? "",
        e.campeaoTelefone ?? "",
        e.campeaoEmail ?? "",
        e.confirmado ? "Sim" : "Nao",
        e.origem === "manual" ? "Manual" : "Busca",
      ];
    });

    baixarCsv(
      `fp-pipe-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      cabecalho,
      linhas
    );
  };

  const desbloquearSelecionadas = async () => {
    const alvos = empresasEncontradas.filter(
      (e) =>
        empresasSelecionadas.has(e.cnpj) &&
        !empresasDesbloqueadas.has(e.cnpj)
    );

    if (alvos.length === 0) return;

    if ((saldoCreditos ?? 0) < alvos.length) {
      alert(
        `Você tem ${saldoCreditos} crédito(s), mas precisa de ${alvos.length}.`
      );
      setModalCompraAberto(true);
      return;
    }

    const novoSaldo = (saldoCreditos ?? 0) - alvos.length;
    setSaldoCreditos(novoSaldo);
    setEmpresasDesbloqueadas((atual) => {
      const novo = new Set(atual);
      alvos.forEach((a) => novo.add(a.cnpj));
      return novo;
    });

    try {
      const supabase = criarClienteSupabase();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("creditos")
            .update({
              saldo: novoSaldo,
              atualizado_em: new Date().toISOString(),
            })
            .eq("usuario_id", user.id);
        }
      }
    } catch (erroLote) {
      console.error("Erro ao debitar créditos em lote:", erroLote);
    }
  };

  const empresaEmEdicao = empresasEncontradas.find(
    (e) => e.cnpj === cnpjEmEdicao
  );

  const persistirPessoas = async (
    cnpj: string,
    dados: DadosPessoas,
    confirmado: boolean
  ) => {
    try {
      const supabase = criarClienteSupabase();

      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from("companies")
        .update({
          decisor_nome: dados.aprovadorNome || null,
          decisor_cargo: dados.aprovadorCargo || null,
          aprovador_linkedin: dados.aprovadorLinkedin || null,
          aprovador_telefone: dados.aprovadorTelefone || null,
          aprovador_email: dados.aprovadorEmail || null,
          campeao_nome: dados.campeaoNome || null,
          campeao_cargo: dados.campeaoCargo || null,
          campeao_linkedin: dados.campeaoLinkedin || null,
          campeao_telefone: dados.campeaoTelefone || null,
          campeao_email: dados.campeaoEmail || null,
          linkedin: dados.empresaLinkedin || null,
          confirmado,
          atualizado_em: new Date().toISOString(),
        })
        .match({ usuario_id: user.id, cnpj });
    } catch (erroPersistencia) {
      console.error("Erro ao salvar pessoas do lead:", erroPersistencia);
    }
  };

  const salvarEdicaoPessoas = async (dados: DadosPessoas) => {
    if (!cnpjEmEdicao) return;

    const cnpjAlvo = cnpjEmEdicao;

    setEmpresasEncontradas((atual) =>
      atual.map((e) =>
        e.cnpj === cnpjAlvo
          ? {
              ...e,
              decisorNome: dados.aprovadorNome || e.decisorNome,
              decisorCargo: dados.aprovadorCargo || e.decisorCargo,
              aprovadorLinkedin: dados.aprovadorLinkedin || null,
              aprovadorTelefone: dados.aprovadorTelefone || null,
              aprovadorEmail: dados.aprovadorEmail || null,
              campeaoNome: dados.campeaoNome || null,
              cargoPrioritario: dados.campeaoCargo || e.cargoPrioritario,
              campeaoLinkedin: dados.campeaoLinkedin || null,
              campeaoTelefone: dados.campeaoTelefone || null,
              campeaoEmail: dados.campeaoEmail || null,
              linkedin: dados.empresaLinkedin || e.linkedin,
            }
          : e
      )
    );

    setCnpjEmEdicao(null);
    await persistirPessoas(cnpjAlvo, dados, false);
  };

  const confirmarLead = async (cnpj: string) => {
    setEmpresasEncontradas((atual) =>
      atual.map((e) => (e.cnpj === cnpj ? { ...e, confirmado: true } : e))
    );

    const alvo = empresasEncontradas.find((e) => e.cnpj === cnpj);

    await persistirPessoas(
      cnpj,
      {
        aprovadorNome: alvo?.decisorNome ?? "",
        aprovadorCargo: alvo?.decisorCargo ?? "",
        aprovadorLinkedin: alvo?.aprovadorLinkedin ?? "",
        aprovadorTelefone: alvo?.aprovadorTelefone ?? "",
        aprovadorEmail: alvo?.aprovadorEmail ?? "",
        campeaoNome: alvo?.campeaoNome ?? "",
        campeaoCargo: alvo?.campeaoCargo ?? alvo?.cargoPrioritario ?? "",
        campeaoLinkedin: alvo?.campeaoLinkedin ?? "",
        campeaoTelefone: alvo?.campeaoTelefone ?? "",
        campeaoEmail: alvo?.campeaoEmail ?? "",
        empresaLinkedin: alvo?.linkedin ?? "",
      },
      true
    );
  };

  // Volta ao topo sempre que mudar de etapa
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [etapa]);

  // =========================
  // VOLTAR PARA O LEAD CLICADO
  // (usuario abre o LinkedIn e, ao retornar, a lista
  // rola de volta para a linha dele)
  // =========================

  const cnpjRolagemRef = useRef<string | null>(null);

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      const alvo = (e.target as HTMLElement | null)?.closest(
        "a[href*='linkedin.com'], a[href^='mailto:']"
      );
      const linha = alvo?.closest("[data-cnpj]");
      if (linha) {
        cnpjRolagemRef.current = linha.getAttribute("data-cnpj");
      }
    };

    const voltarParaOLead = () => {
      const cnpj = cnpjRolagemRef.current;
      if (!cnpj) return;

      const linha = document.querySelector(`[data-cnpj="${cnpj}"]`);
      linha?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const aoVisibilidade = () => {
      if (!document.hidden) voltarParaOLead();
    };

    document.addEventListener("click", aoClicar);
    window.addEventListener("focus", voltarParaOLead);
    document.addEventListener("visibilitychange", aoVisibilidade);

    return () => {
      document.removeEventListener("click", aoClicar);
      window.removeEventListener("focus", voltarParaOLead);
      document.removeEventListener("visibilitychange", aoVisibilidade);
    };
  }, []);

  // =========================
  // PERSISTENCIA DO FORMULARIO
  // (o usuario nunca perde o que digitou)
  // =========================

  // Restauracao inicial a partir do sessionStorage (executa 1x no mount).
  // Excecao justificada: inicializacao a partir de sistema externo.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem("fp-pipe-wizard");

      if (!salvo) return;

      const d = JSON.parse(salvo);

      if (Array.isArray(d.porteEmpresa)) setPorteEmpresa(d.porteEmpresa);
      if (Array.isArray(d.faixaFuncionarios))
        setFaixaFuncionarios(d.faixaFuncionarios);
      if (d.tipoLocalizacao) setTipoLocalizacao(d.tipoLocalizacao);
      if (d.estadoSelecionado) setEstadoSelecionado(d.estadoSelecionado);
      if (d.cidade) setCidade(d.cidade);
      if (Array.isArray(d.segmentosSelecionados))
        setSegmentosSelecionados(d.segmentosSelecionados);
    } catch {}
  }, []);
  

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "fp-pipe-wizard",
        JSON.stringify({
          porteEmpresa,
          faixaFuncionarios,
          tipoLocalizacao,
          estadoSelecionado,
          cidade,
          segmentosSelecionados,
        })
      );
    } catch {}
  }, [
    porteEmpresa,
    faixaFuncionarios,
    tipoLocalizacao,
    estadoSelecionado,
    cidade,
    segmentosSelecionados,
  ]);

  const copiar = async (rotulo: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);

      setCopiado(rotulo);

      setTimeout(() => setCopiado(""), 2000);
    } catch {
      alert("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  };

  // =========================
  // ANALISAR ÁREA COM LLAMA
  // =========================
  // RESUMO DA OFERTA (perfil + anexos)
  // =========================

  const montarResumoOferta = (): string => {
    const partes: string[] = [];

    if (perfil?.area_atuacao) partes.push(`Área: ${perfil.area_atuacao}`);

    if (perfil?.produtos_servicos) {
      partes.push(perfil.produtos_servicos);
    }

    if (perfil?.site) partes.push(`Site: ${perfil.site}`);

    if (perfil?.nichos && perfil.nichos.length > 0) {
      partes.push(`Especialidades/serviços confirmados pelo cliente: ${perfil.nichos.join("; ")}`);
    }

    (perfil?.anexos ?? []).forEach((anexo) => {
      if (anexo.texto) {
        partes.push(
          `[Portfólio — ${anexo.nome}]: ${anexo.texto}`
        );
      }
    });

    return partes.join("\n\n");
  };

  const montarPerfilVendedor = (): string => {
    if (!perfil?.nome_empresa && !perfil?.produtos_servicos) return "";

    const partes: string[] = [];

    if (perfil.nome_empresa) partes.push(`Empresa: ${perfil.nome_empresa}.`);

    if (perfil.area_atuacao) partes.push(`Área: ${perfil.area_atuacao}.`);

    if (perfil.site) partes.push(`Site: ${perfil.site}.`);

    if (perfil.nichos && perfil.nichos.length > 0) {
      partes.push(`Especialidades confirmadas: ${perfil.nichos.join("; ")}.`);
    }

    if (perfil.produtos_servicos) {
      partes.push(`Vendemos: ${perfil.produtos_servicos}`);
    }

    (perfil?.anexos ?? []).forEach((anexo) => {
      if (anexo.texto) {
        partes.push(
          `[Portfólio — ${anexo.nome}]: ${anexo.texto}`
        );
      }
    });

    return partes.join(" ");
  };

  // =========================
  // ALTERNAR SELEÇÃO MÚLTIPLA
  // =========================

  const alternarPorte = (porte: string) => {
    if (porteEmpresa.includes(porte)) {
      setPorteEmpresa(
        porteEmpresa.filter((item) => item !== porte)
      );
    } else {
      setPorteEmpresa([...porteEmpresa, porte]);
    }
  };

  const alternarFaixaFuncionarios = (faixa: string) => {
    if (faixaFuncionarios.includes(faixa)) {
      setFaixaFuncionarios(
        faixaFuncionarios.filter((item) => item !== faixa)
      );
    } else {
      setFaixaFuncionarios([
        ...faixaFuncionarios,
        faixa,
      ]);
    }
  };

  const alternarSegmento = (segmento: string) => {
    if (segmentosSelecionados.includes(segmento)) {
      setSegmentosSelecionados(
        segmentosSelecionados.filter((item) => item !== segmento)
      );
    } else {
      setSegmentosSelecionados([
        ...segmentosSelecionados,
        segmento,
      ]);
    }
  };

  // =========================
  // DESCOBERTA DE EMPRESAS (Fase 1)
  // =========================

  const buscarEmpresas = async () => {
    if (!usuarioEmail) {
      setModalAberto(true);
      return;
    }

    if (segmentosSelecionados.length === 0) return;

    setBuscandoEmpresas(true);
    setErroEmpresas("");
    setEmpresasEncontradas([]);
    setPontuadas(false);

    try {
      const resposta = await fetch("/api/buscar-empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentos: segmentosSelecionados,
          estado:
            tipoLocalizacao === "Estado específico" ? estadoSelecionado : "",
          cidade: tipoLocalizacao === "Cidade específica" ? cidade : "",
          portes: porteEmpresa,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao buscar empresas");
      }

      const empresas: Array<{
        cnpj: string;
        cnpjFormatado: string;
        razaoSocial: string;
        nomeFantasia: string;
        situacao: string;
        segmentoIcp: string;
        uf: string;
        municipio: string;
      }> = dados.empresas ?? [];

      setEmpresasEncontradas(empresas);
      setEmpresasSelecionadas(
        new Set(empresas.map((e) => e.cnpj))
      );

      try {
        const supabase = criarClienteSupabase();

        if (supabase && empresas.length > 0) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            await supabase.from("companies").upsert(
              empresas.map((e) => ({
                usuario_id: user.id,
                cnpj: e.cnpj,
                razao_social: e.razaoSocial,
                nome_fantasia: e.nomeFantasia,
                situacao_cadastral: e.situacao,
                segmento_icp: e.segmentoIcp,
                uf: e.uf,
                municipio: e.municipio,
              })),
              { onConflict: "usuario_id,cnpj" }
            );
          }
        }
      } catch (erroSalvamento) {
        console.error(
          "Não foi possível salvar as empresas:",
          erroSalvamento
        );
      }

      await pontuarEmpresas(empresas);
    } catch (erro) {
      setErroEmpresas(
        erro instanceof Error
          ? erro.message
          : "Não conseguimos buscar as empresas agora."
      );
    } finally {
      setBuscandoEmpresas(false);
    }
  };

  const [cargosEscolhidos, setCargosEscolhidos] = useState<string[]>([]);
  const [buscaCargo, setBuscaCargo] = useState("");

  const adicionarCargo = (nome: string) => {
    setCargosEscolhidos((atual) =>
      atual.some((c) => normalizarCargo(c) === normalizarCargo(nome))
        ? atual
        : [...atual, nome]
    );
  };

  const removerCargo = (nome: string) => {
    setCargosEscolhidos((atual) =>
      atual.filter((c) => normalizarCargo(c) !== normalizarCargo(nome))
    );
  };

  const pontuarEmpresas = async (
    lista: Array<{
      cnpj: string;
      cnpjFormatado: string;
      razaoSocial: string;
      nomeFantasia: string;
      segmentoIcp: string;
      uf: string;
      municipio: string;
      capitalSocial?: number | null;
      porte?: string | null;
      score?: number | null;
      motivo?: string | null;
      telefone?: string | null;
      email?: string | null;
      endereco?: string | null;
      decisorNome?: string | null;
      decisorCargo?: string | null;
      cargoPrioritario?: string | null;
      emailProspeccao?: { assunto: string; mensagem: string } | null;
    }>
  ) => {
    if (lista.length === 0) return;

    setPontuandoEmpresas(true);
    setErroEmpresas("");

    const partesIcp = [
      montarResumoOferta() || null,
      segmentosSelecionados.length > 0
        ? `Segmentos-alvo: ${segmentosSelecionados.join(", ")}`
        : null,
      porteEmpresa.length > 0
        ? `Porte de empresa preferido: ${porteEmpresa.join(", ")}`
        : null,
      tipoLocalizacao === "Estado específico"
        ? `Localização: estado de ${estadoSelecionado}`
        : tipoLocalizacao === "Cidade específica"
          ? `Localização: ${cidade}`
          : "Localização: Brasil inteiro",
    ].filter(Boolean);

    try {
      const resposta = await fetch("/api/pontuar-empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "charset": "utf-8",
        },
        body: JSON.stringify({
          icp: partesIcp.join("\n"),
          perfilVendedor: montarPerfilVendedor(),
          cargosPrioritarios: ordenarPorAutoridade(cargosEscolhidos),
          empresas: lista.map((e) => ({
            cnpj: e.cnpj,
            razaoSocial: e.razaoSocial,
          })),
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao pontuar empresas");
      }

      type Avaliacao = {
        cnpj: string;
        score: number | null;
        motivo: string | null;
        telefone?: string | null;
        email?: string | null;
        porte?: string | null;
        capitalSocial?: number | null;
        nomeFantasia?: string | null;
        endereco?: string | null;
        decisorNome?: string | null;
        decisorCargo?: string | null;
      cargoPrioritario?: string | null;
      emailProspeccao?: {
        assunto: string;
        mensagem: string;
      } | null;
      };

      const mapaScores = new Map<string, Avaliacao>(
        ((dados.avaliacoes ?? []) as Avaliacao[]).map((a) => [
          String(a.cnpj),
          a,
        ])
      );

      const atualizadas = lista.map((e) => {
        const avaliacao = mapaScores.get(e.cnpj);
        if (!avaliacao) return e;
        return {
          ...e,
          score:
            typeof avaliacao.score === "number"
              ? avaliacao.score
              : e.score,
          motivo: avaliacao.motivo || e.motivo,
          telefone: avaliacao.telefone ?? e.telefone,
          email: avaliacao.email ?? e.email,
          porte: avaliacao.porte ?? e.porte,
          capitalSocial: avaliacao.capitalSocial ?? e.capitalSocial,
          endereco: avaliacao.endereco ?? e.endereco,
          nomeFantasia: avaliacao.nomeFantasia || e.nomeFantasia,
          decisorNome: avaliacao.decisorNome ?? e.decisorNome,
          decisorCargo: avaliacao.decisorCargo ?? e.decisorCargo,
          cargoPrioritario:
            avaliacao.cargoPrioritario ?? e.cargoPrioritario,
          emailProspeccao: avaliacao.emailProspeccao ?? e.emailProspeccao,
        };
      });

      // Prioridade: 1º empresas com contato (telefone ou e-mail), depois score
      const temContato = (e: (typeof atualizadas)[number]) =>
        Boolean(e.telefone || e.email);

      atualizadas.sort((a, b) => {
        const diferencaContato =
          Number(temContato(b)) - Number(temContato(a));
        if (diferencaContato !== 0) return diferencaContato;
        return (b.score ?? 0) - (a.score ?? 0);
      });
      setEmpresasEncontradas(atualizadas);
      setPontuadas(true);
      setListaJaSalva(false);

      try {
        const supabase = criarClienteSupabase();

        if (supabase) {
          const comScore = atualizadas.filter(
            (e) => typeof e.score === "number" && e.score !== null
          );

          if (comScore.length > 0) {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (user) {
              // Protege edições humanas: descobre quem já está no banco
              // para não sobrescrever fichas editadas pelo usuário
              const { data: existentesRows } = await supabase
                .from("companies")
                .select("cnpj")
                .eq("usuario_id", user.id)
                .in(
                  "cnpj",
                  comScore.map((e) => e.cnpj)
                );

              const jaSalvas = new Set(
                (existentesRows ?? []).map((r) => r.cnpj)
              );

              const novas = comScore.filter((e) => !jaSalvas.has(e.cnpj));
              const antigas = comScore.filter((e) => jaSalvas.has(e.cnpj));

              // Empresas novas: salva completo
              if (novas.length > 0) {
                await supabase.from("companies").upsert(
                  novas.map((e) => ({
                    usuario_id: user.id,
                    cnpj: e.cnpj,
                    razao_social: e.razaoSocial,
                    nome_fantasia: e.nomeFantasia,
                    segmento_icp: e.segmentoIcp,
                    uf: e.uf,
                    municipio: e.municipio,
                    capital_social: e.capitalSocial ?? null,
                    porte: e.porte ?? null,
                    endereco: e.endereco ?? null,
                    email_assunto: e.emailProspeccao?.assunto ?? null,
                    email_corpo: e.emailProspeccao?.mensagem ?? null,
                    score: e.score ?? null,
                    score_motivo: e.motivo ?? null,
                    telefone: e.telefone ?? null,
                    email: e.email ?? null,
                    decisor_nome: e.decisorNome ?? null,
                    decisor_cargo: e.decisorCargo ?? null,
                    cargo_prioritario: e.cargoPrioritario ?? null,
                  })),
                  { onConflict: "usuario_id,cnpj" }
                );
              }

              // Empresas já salvas: atualiza SÓ dados de máquina.
              // decisor_nome/decisor_cargo ficam intocados (edições do usuário)
              for (const e of antigas) {
                await supabase
                  .from("companies")
                  .update({
                    score: e.score ?? null,
                    score_motivo: e.motivo ?? null,
                    capital_social: e.capitalSocial ?? null,
                    porte: e.porte ?? null,
                    endereco: e.endereco ?? null,
                    nome_fantasia: e.nomeFantasia || "",
                    email_assunto: e.emailProspeccao?.assunto ?? null,
                    email_corpo: e.emailProspeccao?.mensagem ?? null,
                    telefone: e.telefone ?? null,
                    email: e.email ?? null,
                    cargo_prioritario: e.cargoPrioritario ?? null,
                  })
                  .match({ usuario_id: user.id, cnpj: e.cnpj });
              }

              // A lista agora é salva apenas quando o usuário clica em
              // "Salvar em minhas listas" (função salvarListaAtual).
            }
          }
        }
      } catch (erroSalvamento) {
        console.error("Não foi possível salvar os scores:", erroSalvamento);
      }
    } catch (erro) {
      setErroEmpresas(
        erro instanceof Error
          ? erro.message
          : "Não conseguimos pontuar as empresas agora."
      );
    } finally {
      setPontuandoEmpresas(false);
    }
  };

  // =========================
  // GERAR ICP COMPLETO
  // =========================

  const gerarPerfilICP = async () => {
    if (!usuarioEmail) {
      setModalAberto(true);
      return;
    }

    if (
      !tipoCliente ||
      porteEmpresa.length === 0 ||
      !tipoLocalizacao
    ) {
      alert(
        "Preencha pelo menos o tipo de cliente, o porte da empresa e a localização."
      );

      return;
    }

    if (
      (tipoLocalizacao === "Estado específico" ||
        tipoLocalizacao === "Cidade específica") &&
      !estadoSelecionado
    ) {
      alert("Selecione um estado.");
      return;
    }

    if (
      tipoLocalizacao === "Cidade específica" &&
      !cidade.trim()
    ) {
      alert("Informe uma cidade.");
      return;
    }

    setGerandoICP(true);
    setIcpGerado(null);
    setCargosEscolhidos([]);
    setBuscaCargo("");

    try {
      const resposta = await fetch("/api/gerar-icp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nomeEmpresa: perfil?.nome_empresa || "",
          produto: perfil?.area_atuacao || "",
          areaAtuacao: perfil?.area_atuacao || "",
          produtosServicos: montarResumoOferta(),
          siteEmpresa: perfil?.site || "",
          nichosSelecionados: [],
          tipoCliente,
          porteEmpresa,
          faixaFuncionarios,
          tipoLocalizacao,
          estadoSelecionado,
          cidade,
          segmentosSelecionados,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Erro ao gerar ICP"
        );
      }

      setIcpGerado(dados.resultado);

      const sugestoesCargos = [
        ...(dados.resultado.decisores || []),
        ...(dados.resultado.influenciadores || []),
      ];

      const cargosValidos: string[] = [];

      sugestoesCargos.forEach((cargo) => {
        const existeNoCatalogo = CATALOGO_CARGOS.some(
          (item) => normalizarCargo(item.nome) === normalizarCargo(cargo)
        );

        if (
          existeNoCatalogo &&
          !cargosValidos.some(
            (v) => normalizarCargo(v) === normalizarCargo(cargo)
          )
        ) {
          cargosValidos.push(cargo);
        }
      });

      setCargosEscolhidos(cargosValidos);

      try {
        const supabase = criarClienteSupabase();

        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            await supabase.from("icps").insert({
              usuario_id: user.id,
              nome_empresa: perfil?.nome_empresa || null,
              area_atuacao: perfil?.area_atuacao || null,
              segmentos: segmentosSelecionados,
              dados: dados.resultado,
            });
          }
        }
      } catch (erroSalvamento) {
        console.error("Não foi possível salvar o ICP:", erroSalvamento);
      }

      setEtapa(2);
    } catch (erro) {
      console.error(erro);

        alert(
          "Não conseguimos concluir sua análise agora. Aguarde alguns instantes e tente novamente."
        );
    } finally {
      setGerandoICP(false);
    }
  };
  if (carregandoAuth) {
    return (
      <main className="min-h-screen bg-pipe-bg">
        <PopEspera
          aberto
          titulo="Carregando o FP Pipe"
          mensagem="Conferindo seus dados..."
          rodape=""
        />
      </main>
    );
  }

  if (!usuarioEmail) {
    return <TelaEntrada />;
  }

  const mostrandoResultados = empresasEncontradas.length > 0;

  return (

    <main className="min-h-screen bg-background">
      {/* ========================= */}
      {/* NAVBAR                    */}
      {/* ========================= */}

      <nav className="sticky top-0 z-50 bg-[#030609]/95 backdrop-blur border-b border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={irParaLanding}
            className="font-display text-3xl tracking-wider text-white leading-none"
          >
            FP<span className="text-pipe-lime">PIPE</span>
          </button>

          <div className="flex items-center gap-6">
            {tela === "landing" && (
              <a
                href="#como-funciona"
                className="hidden md:block text-sm text-pipe-muted hover:text-white transition"
              >
                Como funciona
              </a>
            )}

            {usuarioEmail ? (
              <>
                <a
                  href="/listas"
                  className="text-sm text-pipe-muted hover:text-white transition"
                >
                  Minhas listas
                </a>

                <button
                  onClick={sairDaConta}
                  className="text-sm text-pipe-muted hover:text-white transition"
                  title={usuarioEmail}
                >
                  Sair
                </button>
              </>
            ) : (
              <a
                href="/login"
                className="text-sm text-pipe-muted hover:text-white transition"
              >
                Entrar
              </a>
            )}

            <button
              onClick={iniciarApp}
              className="bg-pipe-blue text-black text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition"
            >
              Criar minha lista
            </button>
          </div>
        </div>
      </nav>

      {/* ========================= */}
      {/* LANDING PAGE              */}
      {/* ========================= */}

      {tela === "landing" && (
        <>
          {/* HERO */}

          <section className="relative overflow-hidden">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-pipe-blue/10 blur-3xl pointer-events-none" />

            <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
              <span className="inline-block border border-pipe-border bg-pipe-card text-pipe-blue text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full">
                Inteligência Comercial · Prospecção B2B
              </span>

              <h1 className="font-display text-6xl md:text-8xl mt-8 leading-[0.95] text-white">
                Seu cliente ideal.
                <br />
                <span className="text-pipe-lime">Listas prontas.</span>
                <br />
                Receita previsível.
              </h1>

              <p className="mt-6 max-w-2xl mx-auto text-pipe-muted text-lg">
                Você responde um questionário rápido e nossa equipe de
                inteligência comercial monta seu Perfil de Cliente Ideal
                completo — mais de 10 tipos de empresa, decisores e
                influenciadores, dores do mercado e e-mail de prospecção
                prontos para usar. Em seguida: lista de empresas com score,
                e-mail personalizado por lead e links de LinkedIn.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={iniciarApp}
                  className="bg-pipe-lime text-black font-bold px-8 py-4 rounded-lg hover:opacity-90 transition text-lg"
                >
                  Criar meu ICP agora →
                </button>

                <a
                  href="#como-funciona"
                  className="border border-pipe-border text-white px-8 py-4 rounded-lg hover:bg-pipe-card transition text-lg"
                >
                  Ver como funciona
                </a>
              </div>
            </div>
          </section>

          {/* NÚMEROS */}

          <section className="border-y border-pipe-border bg-pipe-dark">
            <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                ["~2 min", "para receber seu ICP completo"],
                ["10+", "tipos de empresa mapeados"],
                ["E-mail por lead", "personalizado e pronto para enviar"],
                ["Score", "por empresa (em breve)"],
              ].map(([destaque, legenda]) => (
                <div key={legenda}>
                  <p className="font-display text-4xl text-pipe-blue">
                    {destaque}
                  </p>

                  <p className="text-pipe-muted text-sm mt-1">{legenda}</p>
                </div>
              ))}
            </div>
          </section>

          {/* COMO FUNCIONA */}

          <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24">
            <p className="text-pipe-blue text-sm font-semibold tracking-widest uppercase text-center">
              Pipeline
            </p>

            <h2 className="font-display text-5xl md:text-6xl text-center mt-3 text-white">
              Como funciona
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-12">
              {passosLanding.map((passo, indice) => (
                <div
                  key={passo.titulo}
                  className="bg-pipe-card border border-pipe-border rounded-xl p-6 hover:border-pipe-blue/50 transition"
                >
                  <span className="font-display text-4xl text-pipe-blue">
                    {String(indice + 1).padStart(2, "0")}
                  </span>

                  <h3 className="font-bold text-lg mt-3 text-white">
                    {passo.titulo}
                  </h3>

                  <p className="text-pipe-muted text-sm mt-2">
                    {passo.descricao}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* O QUE VOCÊ RECEBE */}

          <section className="border-t border-pipe-border bg-pipe-dark">
            <div className="max-w-6xl mx-auto px-6 py-24">
              <p className="text-pipe-blue text-sm font-semibold tracking-widest uppercase text-center">
                Entregáveis
              </p>

              <h2 className="font-display text-5xl md:text-6xl text-center mt-3 text-white">
                O que você recebe
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
                {entregaveis.map((item) => (
                  <div
                    key={item.titulo}
                    className="bg-pipe-card border border-pipe-border rounded-xl p-6 hover:border-pipe-lime/50 transition"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pipe-lime/15 text-pipe-lime font-bold">
                      ✓
                    </span>

                    <h3 className="font-bold text-lg mt-4 text-white">
                      {item.titulo}
                    </h3>

                    <p className="text-pipe-muted text-sm mt-2">
                      {item.descricao}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <button
                  onClick={iniciarApp}
                  className="bg-pipe-lime text-black font-bold px-10 py-4 rounded-lg hover:opacity-90 transition text-lg"
                >
                  Quero meu ICP agora →
                </button>
              </div>
            </div>
          </section>

          {/* CTA FINAL */}

          <section className="border-t border-pipe-border bg-pipe-dark">
            <div className="max-w-6xl mx-auto px-6 py-20 text-center">
              <h2 className="font-display text-5xl md:text-6xl text-white">
                Chega de prospectar no escuro.
              </h2>

              <p className="text-pipe-muted mt-4">
                Crie seu primeiro ICP agora — grátis.
              </p>

              <button
                onClick={iniciarApp}
                className="mt-8 bg-pipe-lime text-black font-bold px-10 py-4 rounded-lg hover:opacity-90 transition text-lg"
              >
                Começar agora →
              </button>
            </div>
          </section>

          {/* FOOTER */}

          <footer className="border-t border-pipe-border">
            <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="font-display text-2xl tracking-wider text-white">
                FP<span className="text-pipe-lime">PIPE</span>
              </span>

              <p className="text-pipe-muted text-sm">
                Inteligência Comercial · Prospecção B2B
              </p>

              <p className="text-pipe-muted text-xs">
                © 2026 FP Pipe. Todos os direitos reservados.
              </p>
            </div>
          </footer>
        </>
      )}

      {/* ========================= */}
      {/* APP - ASSISTENTE DE ICP   */}
      {/* ========================= */}

      {tela === "app" && usuarioEmail && (
        <Sidebar
          perfil={perfil}
          saldoCreditos={saldoCreditos}
          aoAbrirPerfil={() => setModalPerfilAberto(true)}
        />
      )}

      <ModalPerfil
        key={`perfil-${modalPerfilAberto}-${perfil?.produtos_servicos ? "ok" : "vazio"}`}
        aberto={modalPerfilAberto}
        obrigatorio={!perfil?.produtos_servicos}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={(novoPerfil) => {
          setPerfil(novoPerfil);
        }}
      />

      {tela === "app" && (
        <div
          className={`px-6 py-12 w-full mx-auto ${
            mostrandoResultados ? "max-w-7xl" : etapa === 2 ? "max-w-6xl" : "max-w-3xl"
          } ${usuarioEmail ? "lg:pl-72 lg:mx-0" : ""}`}
        >
          {!mostrandoResultados && (
          <div className="flex gap-2 mb-10">
            {[1, 2].map((numero) => (
              <div
                key={numero}
                className={`h-1 flex-1 rounded-full transition ${
                  etapa >= numero ? "bg-pipe-blue" : "bg-pipe-border"
                }`}
              />
            ))}
          </div>
          )}

          {/* ========================= */}
          {/* ETAPA 2                   */}
          {/* ========================= */}

          {etapa === 1 && (
            <>
              <div className="mb-8">
                <p className="text-sm font-semibold text-pipe-blue tracking-widest uppercase">
                  Etapa 1 de 2
                </p>

                <h1 className="font-display text-5xl mt-2 text-white">
                  Quem é o seu cliente ideal?
                </h1>

                <p className="mt-3 text-pipe-muted">
                  Agora vamos configurar o perfil das empresas que você deseja
                  alcançar.
                </p>
              </div>

              <div className="bg-pipe-card border border-pipe-border p-4 rounded-lg mb-8">
                <p className="font-semibold text-white">Área de atuação:</p>

                <p className="text-pipe-muted">
                  {perfil?.area_atuacao || perfil?.nome_empresa || "—"}
                </p>
              </div>

              {/* PORTE */}

              <div className="mb-8">
                <h2 className="font-bold text-xl mb-2 text-white">
                  Qual porte de empresa você quer alcançar?
                </h2>

                <p className="text-pipe-muted mb-4">
                  Você pode selecionar mais de uma opção.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    "Pequena",
                    "Média",
                    "Grande",
                    "Sem preferência",
                  ].map((porte) => {
                    const selecionado =
                      porteEmpresa.includes(porte);

                    return (
                      <button
                        key={porte}
                        onClick={() => alternarPorte(porte)}
                        className={`border rounded-lg p-3 transition ${
                          selecionado
                            ? "bg-pipe-blue text-black border-pipe-blue font-medium"
                            : "bg-pipe-card border-pipe-border hover:border-pipe-blue/60"
                        }`}
                      >
                        {selecionado ? "✓ " : ""}
                        {porte}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FUNCIONÁRIOS */}

              <div className="mb-8">
                <h2 className="font-bold text-xl mb-2 text-white">
                  Quantidade de funcionários
                </h2>

                <p className="text-pipe-muted mb-4">
                  Você pode selecionar várias faixas.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    "1–10",
                    "11–50",
                    "51–200",
                    "201–500",
                    "501–1000",
                    "1000+",
                  ].map((faixa) => {
                    const selecionado =
                      faixaFuncionarios.includes(faixa);

                    return (
                      <button
                        key={faixa}
                        onClick={() =>
                          alternarFaixaFuncionarios(faixa)
                        }
                        className={`border rounded-lg p-3 transition ${
                          selecionado
                            ? "bg-pipe-blue text-black border-pipe-blue font-medium"
                            : "bg-pipe-card border-pipe-border hover:border-pipe-blue/60"
                        }`}
                      >
                        {selecionado ? "✓ " : ""}
                        {faixa}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LOCALIZAÇÃO */}

              <div className="mb-8">
                <h2 className="font-bold text-xl mb-2 text-white">
                  Onde você quer prospectar?
                </h2>

                <p className="text-pipe-muted mb-4">
                  Escolha o nível de localização desejado.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Sem restrição",
                    "Brasil inteiro",
                    "Estado específico",
                    "Cidade específica",
                  ].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => {
                        setTipoLocalizacao(tipo);

                        if (
                          tipo === "Sem restrição" ||
                          tipo === "Brasil inteiro"
                        ) {
                          setEstadoSelecionado("");
                          setCidade("");
                        }

                        if (tipo === "Estado específico") {
                          setCidade("");
                        }
                      }}
                      className={`border rounded-lg p-4 text-left transition ${
                        tipoLocalizacao === tipo
                          ? "bg-pipe-blue text-black border-pipe-blue font-medium"
                          : "bg-pipe-card border-pipe-border hover:border-pipe-blue/60"
                      }`}
                    >
                      {tipoLocalizacao === tipo ? "✓ " : ""}
                      {tipo}
                    </button>
                  ))}
                </div>

                {(tipoLocalizacao === "Estado específico" ||
                  tipoLocalizacao === "Cidade específica") && (
                  <div className="mt-4">
                    <label className="block font-medium mb-2 text-white">
                      Selecione o estado
                    </label>

                    <select
                      value={estadoSelecionado}
                      onChange={(e) =>
                        setEstadoSelecionado(e.target.value)
                      }
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-4 focus:border-pipe-blue focus:outline-none"
                    >
                      <option value="">
                        Selecione um estado
                      </option>

                      {estadosBrasil.map((estado) => (
                        <option
                          key={estado.sigla}
                          value={estado.sigla}
                        >
                          {estado.nome} ({estado.sigla})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {tipoLocalizacao === "Cidade específica" && (
                  <div className="mt-4">
                    <label className="block font-medium mb-2 text-white">
                      Cidade
                    </label>

                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) =>
                        setCidade(e.target.value)
                      }
                      placeholder="Digite a cidade"
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-4 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60"
                    />
                  </div>
                )}
              </div>

              {/* SEGMENTOS */}

              <div className="mb-8">
                <h2 className="font-bold text-xl mb-2 text-white">
                  Existe algum segmento específico?
                </h2>

                <p className="text-pipe-muted mb-4">
                  Opcional. Selecione os mercados que você deseja atingir.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {segmentosDisponiveis.map((segmento) => {
                    const selecionado =
                      segmentosSelecionados.includes(segmento);

                    return (
                      <button
                        key={segmento}
                        onClick={() => alternarSegmento(segmento)}
                        className={`border rounded-lg p-3 text-sm text-left transition ${
                          selecionado
                            ? "bg-pipe-blue text-black border-pipe-blue font-medium"
                            : "bg-pipe-card border-pipe-border hover:border-pipe-blue/60"
                        }`}
                      >
                        {selecionado ? "✓ " : ""}
                        {segmento}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BOTÕES */}

              <div className="flex gap-4">
                <button
                  onClick={gerarPerfilICP}
                  disabled={gerandoICP}
                  className="w-full bg-pipe-lime text-black font-semibold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                >
                  {gerandoICP
                    ? "Montando seu ICP..."
                    : "Gerar meu ICP →"}
                </button>
              </div>

            </>
          )}

          {/* ========================= */}
          {/* ETAPA 3 - RESULTADO       */}
          {/* ========================= */}

          {etapa === 2 && (
            <>
            <div
              className={
                mostrandoResultados
                  ? ""
                  : "grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start"
              }
            >
              {!mostrandoResultados && (
                <aside className="bg-pipe-card/40 border border-pipe-border rounded-xl p-5 lg:sticky lg:top-8 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-pipe-blue tracking-widest uppercase mb-1">
                      Sua operação
                    </p>

                    <h2 className="font-bold text-lg text-white">
                      Filtros escolhidos
                    </h2>
                  </div>

                  <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-pipe-muted font-bold mb-1">
                      Área de atuação
                    </p>

                    <p className="text-sm text-gray-200">
                      {perfil?.area_atuacao || perfil?.nome_empresa || "—"}
                    </p>
                  </div>

                  <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-pipe-muted font-bold mb-1">
                      Porte da empresa
                    </p>

                    <p className="text-sm text-gray-200">
                      {porteEmpresa.length > 0 ? porteEmpresa.join(", ") : "—"}
                    </p>
                  </div>

                  <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-pipe-muted font-bold mb-1">
                      Funcionários
                    </p>

                    <p className="text-sm text-gray-200">
                      {faixaFuncionarios.length > 0
                        ? faixaFuncionarios.join(", ")
                        : "—"}
                    </p>
                  </div>

                  <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-pipe-muted font-bold mb-1">
                      Localização
                    </p>

                    <p className="text-sm text-gray-200">
                      {tipoLocalizacao === "Estado específico"
                        ? `Estado de ${estadoSelecionado}`
                        : tipoLocalizacao === "Cidade específica"
                          ? `${cidade} - ${estadoSelecionado}`
                          : "Brasil inteiro"}
                    </p>
                  </div>

                  {segmentosSelecionados.length > 0 && (
                    <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                      <p className="text-[11px] uppercase tracking-wide text-pipe-muted font-bold mb-1">
                        Segmentos
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {segmentosSelecionados.map((segmento) => (
                          <span
                            key={segmento}
                            className="bg-pipe-card border border-pipe-border px-2 py-0.5 rounded-full text-xs text-gray-300"
                          >
                            {segmento}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {perfil?.nichos && perfil.nichos.length > 0 && (
                    <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                      <p className="text-[11px] uppercase tracking-wide text-pipe-muted font-bold mb-1">
                        Especialidades confirmadas
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {perfil.nichos.map((nicho) => (
                          <span
                            key={nicho}
                            className="bg-pipe-lime/10 border border-pipe-lime/30 px-2 py-0.5 rounded-full text-xs text-pipe-lime"
                          >
                            {nicho}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setEtapa(1)}
                    className="w-full border border-pipe-border text-gray-300 py-2 rounded-lg text-xs font-semibold hover:bg-pipe-card hover:text-white transition"
                  >
                    ← Ajustar filtros
                  </button>
                </aside>
              )}

              <div>
              <div className="mb-8">
                <p className="text-sm font-semibold text-pipe-blue tracking-widest uppercase">
                  Etapa 2 de 2
                </p>

                <h1 className="font-display text-5xl mt-2 text-white">
                  Seu ICP está pronto!
                </h1>

                <p className="mt-3 text-pipe-muted">
                  Nossa equipe analisou suas informações e criou o perfil do
                  seu cliente ideal.
                </p>
              </div>

              {icpGerado && (
                <div className="space-y-6">

                  {/* RESUMO */}

                  <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                    <h2 className="font-bold text-lg mb-2 text-pipe-blue">
                      Resumo do ICP
                    </h2>

                    <p className="text-gray-300">
                      {icpGerado.resumo_icp}
                    </p>
                  </div>

                  {/* TIPOS DE EMPRESA */}

                  <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                    <h2 className="font-bold text-lg mb-3 text-white">
                      Tipos de Empresa Ideal
                    </h2>

                    <div className="flex flex-wrap gap-2">
                      {(icpGerado.tipos_de_empresa || []).map((tipo: string) => (
                        <span
                          key={tipo}
                          className="bg-pipe-dark border border-pipe-border px-3 py-1 rounded-full text-sm text-gray-300"
                        >
                          {tipo}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* DECISORES E INFLUENCIADORES */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                      <h2 className="font-bold text-lg mb-3 text-purple-400">
                        Decisores
                      </h2>

                      <p className="text-xs text-pipe-muted mb-3">
                        Quem aprova e assina a compra
                      </p>

                      <ul className="space-y-2">
                        {(icpGerado.decisores || []).map((cargo: string) => (
                          <li key={cargo} className="text-gray-300 flex gap-2">
                            <span className="text-purple-400 font-bold">•</span>
                            {cargo}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                      <h2 className="font-bold text-lg mb-3 text-amber-400">
                        Influenciadores
                      </h2>

                      <p className="text-xs text-pipe-muted mb-3">
                        Quem pesquisa, testa e recomenda
                      </p>

                      <ul className="space-y-2">
                        {(icpGerado.influenciadores || []).map((cargo: string) => (
                          <li key={cargo} className="text-gray-300 flex gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            {cargo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CARGOS-ALVO SELECIONÁVEIS */}

                  <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-bold text-lg text-lime-400">
                        🎯 Cargos-alvo da caça
                      </h2>
                      {cargosEscolhidos.length > 0 && (
                        <span className="text-xs font-semibold bg-pipe-lime/10 text-pipe-lime px-2 py-1 rounded-full">
                          {cargosEscolhidos.length} selecionado
                          {cargosEscolhidos.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-pipe-muted mb-4">
                      A IA sugeriu os cargos abaixo. Busque e ajuste à vontade —
                      a numeração é a hierarquia de autoridade: procuramos o
                      cargo 1 primeiro; se a empresa não tiver, vamos para o
                      próximo.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {ordenarPorAutoridade(cargosEscolhidos).map(
                        (cargo, indice) => {
                          const nivelCatalogo = CATALOGO_CARGOS.find(
                            (item) =>
                              normalizarCargo(item.nome) ===
                              normalizarCargo(cargo)
                          );

                          return (
                            <span
                              key={cargo}
                              className="inline-flex items-center gap-2 bg-pipe-dark border border-pipe-lime/40 text-gray-200 pl-2 pr-1 py-1 rounded-full text-sm"
                            >
                              <span className="font-bold text-pipe-lime">
                                {indice + 1}º
                              </span>
                              {cargo}
                              {nivelCatalogo && (
                                <span className="text-[10px] text-pipe-muted">
                                  {rotuloNivel(nivelCatalogo.nivel)}
                                </span>
                              )}
                              <button
                                onClick={() => removerCargo(cargo)}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-500/20 text-pipe-muted hover:text-red-400 transition"
                                aria-label={`Remover ${cargo}`}
                              >
                                ✕
                              </button>
                            </span>
                          );
                        }
                      )}

                      {cargosEscolhidos.length === 0 && (
                        <p className="text-xs text-pipe-muted/70">
                          Nenhum cargo selecionado ainda — busque abaixo.
                        </p>
                      )}
                    </div>

                    <input
                      value={buscaCargo}
                      onChange={(e) => setBuscaCargo(e.target.value)}
                      placeholder="Buscar cargo... ex.: gerente de ti, diretor comercial, gerente de frota"
                      className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-lime focus:outline-none placeholder:text-pipe-muted/60 text-white text-sm"
                    />

                    {buscaCargo.trim() && (
                      <div className="mt-2 max-h-56 overflow-y-auto border border-pipe-border rounded-lg divide-y divide-pipe-border bg-pipe-dark">
                        {buscarCargos(buscaCargo).map((cargo) => {
                          const jaEscolhido = cargosEscolhidos.some(
                            (c) =>
                              normalizarCargo(c) === normalizarCargo(cargo.nome)
                          );

                          return (
                            <button
                              key={cargo.nome}
                              disabled={jaEscolhido}
                              onClick={() => adicionarCargo(cargo.nome)}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-pipe-card disabled:opacity-40 disabled:hover:bg-pipe-dark transition text-left"
                            >
                              <div>
                                <p className="text-sm text-gray-200">
                                  {cargo.nome}
                                </p>
                                <p className="text-[11px] text-pipe-muted">
                                  {cargo.departamento} ·{" "}
                                  {rotuloNivel(cargo.nivel)}
                                </p>
                              </div>
                              <span
                                className={
                                  jaEscolhido
                                    ? "text-pipe-muted"
                                    : "text-pipe-lime font-bold"
                                }
                              >
                                {jaEscolhido ? "✓" : "+"}
                              </span>
                            </button>
                          );
                        })}

                        {buscarCargos(buscaCargo).length === 0 && (
                          <p className="px-3 py-3 text-xs text-pipe-muted">
                            Nada encontrado. Tente outro termo.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DORES */}

                  <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                    <h2 className="font-bold text-lg mb-3 text-red-400">
                      Principais Dores
                    </h2>

                    <ul className="space-y-2">
                      {(icpGerado.principais_dores || []).map((dor: string) => (
                        <li key={dor} className="text-gray-300 flex gap-2">
                          <span className="text-red-400 font-bold">•</span>
                          {dor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ESTRATÉGIA */}

                  <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                    <h2 className="font-bold text-lg mb-2 text-pipe-lime">
                      Estratégia de Abordagem
                    </h2>

                    <p className="text-gray-300">
                      {icpGerado.estrategia_abordagem}
                    </p>
                  </div>

                  {/* E-MAIL DE PROSPECÇÃO */}

                  {icpGerado.email_prospeccao && (
                    <div className="bg-pipe-card border border-pipe-border p-5 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-lg text-sky-400">
                          E-mail de Prospecção
                        </h2>

                        <button
                          onClick={() =>
                            copiar(
                              "email",
                              `Assunto: ${icpGerado.email_prospeccao?.assunto || ""}\n\n${icpGerado.email_prospeccao?.mensagem || ""}`
                            )
                          }
                          className={`text-sm px-4 py-1.5 rounded-lg border transition ${
                            copiado === "email"
                              ? "bg-sky-400 text-black border-sky-400"
                              : "text-sky-400 border-sky-400/40 hover:bg-sky-400/10"
                          }`}
                        >
                          {copiado === "email"
                            ? "Copiado!"
                            : "Copiar e-mail"}
                        </button>
                      </div>

                      <p className="text-sm font-semibold text-pipe-muted mb-1">
                        Assunto:
                      </p>

                      <p className="font-medium mb-4 text-white">
                        {icpGerado.email_prospeccao.assunto}
                      </p>

                      <p className="text-sm font-semibold text-pipe-muted mb-1">
                        Mensagem:
                      </p>

                      <p className="whitespace-pre-wrap text-gray-300">
                        {icpGerado.email_prospeccao.mensagem}
                      </p>
                    </div>
                  )}

                  <div className="bg-pipe-card/60 border border-pipe-border p-4 rounded-lg">
                    <p className="text-sm text-pipe-muted">
                      💡 Cada empresa da sua lista vai receber um{" "}
                      <span className="text-gray-200 font-semibold">
                        e-mail personalizado pronto para copiar e colar
                      </span>{" "}
                      — com o nome da empresa, o gancho do segmento e o nome
                      do decisor quando encontrarmos.
                    </p>
                  </div>
                </div>
              )}

              {!mostrandoResultados && (
                <>
                  <button
                    onClick={buscarEmpresas}
                    disabled={!icpGerado || buscandoEmpresas}
                    className="mt-8 w-full bg-pipe-lime text-black font-bold py-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition text-lg"
                  >
                    {buscandoEmpresas
                      ? pontuandoEmpresas
                        ? "Analisando aderência das empresas..."
                        : "Buscando empresas no seu ICP..."
                      : "Descobrir e pontuar empresas do meu ICP →"}
                  </button>

                  <button
                    onClick={() => setModalLeadAberto(true)}
                    className="mt-3 w-full border border-pipe-lime/40 text-pipe-lime py-2.5 rounded-lg text-sm font-semibold hover:bg-pipe-lime/10 transition"
                  >
                    ＋ Inserir lead manualmente (já tenho os dados)
                  </button>

                  {erroEmpresas && (
                    <p className="mt-3 text-sm text-red-400 text-center">
                      {erroEmpresas}
                    </p>
                  )}
                </>
              )}
              </div>
            </div>

              {mostrandoResultados && (
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm font-semibold text-pipe-blue tracking-widest uppercase">
                      Sua lista de leads
                    </p>

                    <h1 className="font-display text-4xl mt-1 text-white">
                      {empresasEncontradas.length} empresas encontradas
                    </h1>

                    <p className="text-pipe-muted mt-2 text-sm">
                      Ordenadas por aderência ao seu ICP — clique num lead para
                      ver a ficha completa.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => void salvarListaAtual()}
                      disabled={salvandoLista || listaJaSalva}
                      className={`text-sm font-bold px-4 py-2.5 rounded-lg border transition ${
                        listaJaSalva
                          ? "bg-pipe-lime/15 border-pipe-lime/40 text-pipe-lime"
                          : "bg-pipe-lime text-black border-pipe-lime hover:opacity-90 disabled:opacity-50"
                      }`}
                    >
                      {listaJaSalva
                        ? "✓ Salva em minhas listas"
                        : salvandoLista
                          ? "Salvando..."
                          : "💾 Salvar em minhas listas"}
                    </button>

                    <button
                      onClick={exportarCsv}
                      className="text-sm font-semibold px-4 py-2.5 rounded-lg border border-pipe-border text-gray-300 hover:bg-pipe-card hover:text-white transition"
                    >
                      ⬇️ Exportar CSV
                    </button>

                    <button
                      onClick={() => {
                        setEmpresasEncontradas([]);
                        setPontuadas(false);
                        setListaJaSalva(false);
                        setEmpresasSelecionadas(new Set());
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-sm font-semibold px-4 py-2.5 rounded-lg border border-pipe-border text-pipe-muted hover:bg-pipe-card hover:text-white transition"
                    >
                      🔄 Nova busca
                    </button>
                  </div>
                </div>
              )}

              {empresasEncontradas.length > 0 && (
                <div className="mt-6 border border-pipe-border rounded-xl overflow-hidden">
                  <div className="bg-pipe-card px-4 py-3 border-b border-pipe-border flex items-center justify-between">
                    <span className="font-bold text-white">
                      {empresasEncontradas.length} empresas encontradas
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold bg-pipe-lime/10 text-pipe-lime px-2 py-1 rounded-full">
                        💰 {saldoCreditos ?? 0} créditos
                      </span>
                      <label className="flex items-center gap-2 text-xs text-pipe-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          empresasSelecionadas.size ===
                            empresasEncontradas.length &&
                          empresasEncontradas.length > 0
                        }
                        onChange={alternarTodas}
                        className="w-4 h-4 accent-lime-400"
                      />
                      {empresasSelecionadas.size} de{" "}
                      {empresasEncontradas.length} selecionadas
                      </label>
                      {empresasSelecionadas.size > 0 && (
                        <button
                          onClick={desbloquearSelecionadas}
                          className="text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg hover:bg-amber-500/25 transition whitespace-nowrap"
                        >
                          🔓 Desbloquear selecionadas (
                          {empresasSelecionadas.size} crédito
                          {empresasSelecionadas.size > 1 ? "s" : ""})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-pipe-border max-h-[70vh] overflow-y-auto">
                    {empresasEncontradas.map((empresa, indice) => {
                      const score = empresa.score;
                      const liberado =
                        !CONTATOS_BLOQUEADOS ||
                        indice === 0 ||
                        empresasDesbloqueadas.has(empresa.cnpj);
                      const corScore =
                        score === null || score === undefined
                          ? ""
                          : score >= 70
                            ? "bg-lime-500/15 text-lime-400"
                            : score >= 40
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-red-500/15 text-red-400";

                      return (
                        <div
                          key={empresa.cnpjFormatado}
                          data-cnpj={empresa.cnpj}
                          onClick={() => alternarEmpresa(empresa.cnpj)}
                          className="px-4 py-3 hover:bg-pipe-card/50 transition flex items-start gap-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={empresasSelecionadas.has(
                              empresa.cnpj
                            )}
                            onChange={() =>
                              alternarEmpresa(empresa.cnpj)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 w-4 h-4 mt-1.5 accent-lime-400"
                          />
                          {typeof score === "number" &&
                            score !== null && (
                              <span
                                className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${corScore}`}
                              >
                                {score}
                              </span>
                            )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {empresa.origem === "manual" && (
                                <span className="shrink-0 text-[10px] font-bold bg-pipe-blue/15 text-pipe-blue px-1.5 py-0.5 rounded">
                                  📌 LEAD MANUAL
                                </span>
                              )}
                              <p
                                className={`font-semibold text-white text-sm ${
                                  liberado
                                    ? ""
                                    : "select-none blur-[4px] cursor-not-allowed"
                                }`}
                              >
                                {empresa.razaoSocial}
                              </p>
                            </div>
                            <p
                              className={`text-xs text-pipe-muted mt-1 ${
                                liberado
                                  ? ""
                                  : "select-none blur-[3px] cursor-not-allowed"
                              }`}
                            >
                              CNPJ {empresa.cnpjFormatado}
                              {empresa.endereco
                                ? ` · ${empresa.endereco}`
                                : ` · ${
                                    empresa.municipio
                                      ? `${empresa.municipio}, `
                                      : ""
                                  }${empresa.uf || "Brasil"}`}{" "}
                              · {empresa.segmentoIcp}
                              {empresa.porte ? ` · ${empresa.porte}` : ""}
                              {typeof empresa.capitalSocial ===
                                "number" &&
                              empresa.capitalSocial !== null
                                ? ` · Capital R$ ${empresa.capitalSocial.toLocaleString("pt-BR")}`
                                : ""}
                            </p>
                            {empresa.motivo && (
                              <p className="text-xs text-gray-300 mt-1.5 italic">
                                {empresa.motivo}
                              </p>
                            )}
                            {(empresa.telefone || empresa.email) && (
                              <div className="mt-1.5 flex items-center gap-2">
                                {!liberado ? (
                                  <>
                                    <p className="text-xs text-pipe-muted select-none blur-[3px] cursor-not-allowed">
                                      {[
                                        empresa.telefone
                                          ? `📞 ${formatarTelefone(empresa.telefone)}`
                                          : "",
                                        empresa.email
                                          ? `✉ ${empresa.email}`
                                          : "",
                                      ]
                                        .filter(Boolean)
                                        .join("  ·  ")}
                                    </p>
                                    <span className="shrink-0 text-[10px] font-semibold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded whitespace-nowrap">
                                      🔒 desbloqueia com créditos
                                    </span>
                                  </>
                                ) : (
                                  <p className="text-xs text-pipe-blue font-medium">
                                    {empresa.telefone
                                      ? `📞 ${formatarTelefone(empresa.telefone)}`
                                      : ""}
                                    {empresa.telefone && empresa.email
                                      ? "  ·  "
                                      : ""}
                                    {empresa.email
                                      ? `✉ ${empresa.email}`
                                      : ""}
                                  </p>
                                )}
                              </div>
                            )}
                            {(empresa.decisorNome ||
                              empresa.decisorCargo) && (
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                {!liberado ? (
                                  <>
                                    <p className="text-xs text-pipe-muted select-none blur-[3px] cursor-not-allowed">
                                      👤 {empresa.decisorNome} ·{" "}
                                      {empresa.decisorCargo}
                                    </p>
                                    <span className="shrink-0 text-[10px] font-semibold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded whitespace-nowrap">
                                      🔒 créditos
                                    </span>
                                  </>
                                ) : (
                                  <p className="text-xs text-gray-300 font-medium">
                                    👤 {empresa.decisorNome}
                                    {empresa.decisorCargo
                                      ? ` · ${empresa.decisorCargo}`
                                      : ""}
                                  </p>
                                )}
                                {liberado && empresa.decisorNome && (
                                  <>
                                    {empresa.aprovadorLinkedin && (
                                      <a
                                        href={empresa.aprovadorLinkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-pipe-blue hover:underline whitespace-nowrap"
                                      >
                                        🔗 Perfil →
                                      </a>
                                    )}
                                    {empresa.aprovadorTelefone && (
                                      <span className="text-xs text-pipe-blue">
                                        📞{" "}
                                        {formatarTelefone(
                                          empresa.aprovadorTelefone
                                        )}
                                      </span>
                                    )}
                                    {empresa.aprovadorEmail && (
                                      <a
                                        href={`mailto:${empresa.aprovadorEmail}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-pipe-blue hover:underline whitespace-nowrap"
                                      >
                                        ✉ {empresa.aprovadorEmail}
                                      </a>
                                    )}
                                    <a
                                      href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                                        `${empresa.decisorCargo ?? ""} ${
                                          limparNomeEmpresa(
                                            empresa.nomeFantasia ||
                                              empresa.razaoSocial
                                          )
                                        }`.trim()
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={
                                        empresa.decisorCargo
                                          ? `Buscar pessoas com cargo de ${empresa.decisorCargo} nesta empresa`
                                          : "Buscar pessoas desta empresa"
                                      }
                                      className="text-xs text-pipe-blue hover:underline whitespace-nowrap"
                                    >
                                      🔎 Buscar{" "}
                                      {(empresa.decisorCargo ?? "pessoas")
                                        .toLowerCase()}{" "}
                                      →
                                    </a>
                                  </>
                                )}
                              </div>
                            )}
                            {empresa.cargoPrioritario && (
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                {!liberado ? (
                                  <p className="text-xs text-pipe-muted select-none blur-[3px] cursor-not-allowed">
                                    🎯 Influenciador sugerido:{" "}
                                    {empresa.cargoPrioritario}
                                  </p>
                                ) : (
                                  <>
                                    <p className="text-xs text-lime-400 font-medium">
                                      🎯 Fale com:{" "}
                                      {empresa.campeaoNome
                                        ? `${empresa.campeaoNome} · `
                                        : ""}
                                      {empresa.campeaoCargo ||
                                        empresa.cargoPrioritario}{" "}
                                      <span className="text-pipe-muted font-normal">
                                        (quem recebe sua proposta)
                                      </span>
                                    </p>
                                    <span className="inline-flex items-center gap-3 flex-wrap">
                                      <a
                                        href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
                                          limparNomeEmpresa(
                                            empresa.nomeFantasia ||
                                              empresa.razaoSocial
                                          )
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Passo 1: encontre e abra a página da empresa no LinkedIn"
                                        className="text-xs text-pipe-blue hover:underline whitespace-nowrap"
                                      >
                                        1️⃣ Achar empresa →
                                      </a>
                                      <a
                                        href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                                          `${empresa.cargoPrioritario} ${limparNomeEmpresa(
                                            empresa.nomeFantasia ||
                                              empresa.razaoSocial
                                          )}`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Passo 2: busca direta das pessoas com esse cargo nesta empresa"
                                        className="text-xs text-pipe-blue hover:underline whitespace-nowrap"
                                      >
                                        2️⃣ Ver{" "}
                                        {empresa.cargoPrioritario.toLowerCase()}{" "}
                                        →
                                      </a>
                                      {empresa.campeaoLinkedin && (
                                        <a
                                          href={empresa.campeaoLinkedin}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs text-pipe-blue hover:underline whitespace-nowrap"
                                        >
                                          🔗 Perfil →
                                        </a>
                                      )}
                                      {empresa.campeaoTelefone && (
                                        <span className="text-xs text-pipe-blue">
                                          📞{" "}
                                          {formatarTelefone(
                                            empresa.campeaoTelefone
                                          )}
                                        </span>
                                      )}
                                      {empresa.campeaoEmail && (
                                        <a
                                          href={`mailto:${empresa.campeaoEmail}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs text-pipe-blue hover:underline whitespace-nowrap"
                                        >
                                          ✉ {empresa.campeaoEmail}
                                        </a>
                                      )}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                            {liberado && empresa.emailProspeccao?.mensagem && (
                              <div className="mt-2 bg-pipe-blue/5 border border-pipe-border rounded-lg p-3">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <p className="text-[11px] font-bold text-pipe-blue uppercase tracking-wide">
                                    ✉️ E-mail pronto para este lead
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copiar(
                                        `email-${empresa.cnpj}`,
                                        `${empresa.emailProspeccao?.assunto ?? ""}\n\n${empresa.emailProspeccao?.mensagem ?? ""}`
                                      );
                                    }}
                                    className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition whitespace-nowrap ${
                                      copiado === `email-${empresa.cnpj}`
                                        ? "bg-pipe-blue text-black border-pipe-blue"
                                        : "text-pipe-blue border-pipe-blue/40 hover:bg-pipe-blue/10"
                                    }`}
                                  >
                                    {copiado === `email-${empresa.cnpj}`
                                      ? "Copiado!"
                                      : "📋 Copiar"}
                                  </button>
                                </div>
                                {empresa.emailProspeccao.assunto && (
                                  <p className="text-xs font-semibold text-gray-200 mb-1">
                                    Assunto:{" "}
                                    {empresa.emailProspeccao.assunto}
                                  </p>
                                )}
                                <p className="text-xs text-gray-300 whitespace-pre-wrap">
                                  {empresa.emailProspeccao.mensagem}
                                </p>
                              </div>
                            )}
                            {liberado && empresa.linkedin && (
                              <div className="mt-1">
                                <a
                                  href={empresa.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-pipe-blue hover:underline"
                                >
                                  🔗 LinkedIn da empresa →
                                </a>
                              </div>
                            )}
                            {liberado && (
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCnpjEmEdicao(empresa.cnpj);
                                  }}
                                  className="text-[11px] font-semibold bg-pipe-blue/10 text-pipe-blue border border-pipe-blue/30 px-2 py-1 rounded-lg hover:bg-pipe-blue/20 transition"
                                >
                                  ✏️ Editar pessoas
                                </button>
                                {empresa.confirmado ? (
                                  <span className="text-[11px] font-semibold text-pipe-lime">
                                    ✔️ Confirmado
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmarLead(empresa.cnpj);
                                    }}
                                    className="text-[11px] font-semibold bg-pipe-lime/10 text-pipe-lime border border-pipe-lime/30 px-2 py-1 rounded-lg hover:bg-pipe-lime/20 transition"
                                  >
                                    ✅ Confirmar lead
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {!liberado && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                desbloquearEmpresa(empresa.cnpj);
                              }}
                              className="shrink-0 self-center text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/25 transition whitespace-nowrap"
                            >
                              🔓 1 crédito
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {pontuadas && (
                    <p className="px-4 py-3 text-xs text-pipe-muted border-t border-pipe-border">
                      Ordenadas pelo score de aderência ao seu ICP. A 1ª
                      empresa é amostra grátis — desbloqueie para ver todos os
                      nomes, decisores e contatos.
                    </p>
                  )}
                </div>
              )}

              {!mostrandoResultados && (
                <button
                  onClick={() => setEtapa(1)}
                  className="mt-3 w-full border border-pipe-border text-pipe-muted py-3 rounded-lg hover:bg-pipe-card hover:text-white transition"
                >
                  ← Voltar e editar informações
                </button>
              )}
            </>
          )}
        </div>
      )}

      <PopEspera
        aberto={gerandoICP}
        titulo="Montando seu cliente ideal"
        mensagem="Nossa equipe está analisando seu produto e desenhando o perfil perfeito de cliente."
      />

      <PopEspera
        aberto={buscandoEmpresas && !pontuandoEmpresas}
        titulo="Varrendo o mercado"
        mensagem="Consultando empresas reais e cruzando com os seus segmentos-alvo."
      />

      <PopEspera
        aberto={pontuandoEmpresas}
        titulo="Enriquecendo lista"
        mensagem="Analisando dados de cada empresa e pontuando contra o seu ICP."
      />

      <ModalLeadManual
        aberto={modalLeadAberto}
        onFechar={() => setModalLeadAberto(false)}
        onSalvar={salvarLeadManual}
      />

      {empresaEmEdicao && (
        <ModalEditarPessoas
          aberto
          dadosIniciais={{
            aprovadorNome: empresaEmEdicao.decisorNome ?? "",
            aprovadorCargo: empresaEmEdicao.decisorCargo ?? "",
            aprovadorLinkedin: empresaEmEdicao.aprovadorLinkedin ?? "",
            aprovadorTelefone: empresaEmEdicao.aprovadorTelefone ?? "",
            aprovadorEmail: empresaEmEdicao.aprovadorEmail ?? "",
            campeaoNome: empresaEmEdicao.campeaoNome ?? "",
            campeaoCargo:
              empresaEmEdicao.campeaoCargo ??
              empresaEmEdicao.cargoPrioritario ??
              "",
            campeaoLinkedin: empresaEmEdicao.campeaoLinkedin ?? "",
            campeaoTelefone: empresaEmEdicao.campeaoTelefone ?? "",
            campeaoEmail: empresaEmEdicao.campeaoEmail ?? "",
            empresaLinkedin: empresaEmEdicao.linkedin ?? "",
          }}
          onFechar={() => setCnpjEmEdicao(null)}
          onSalvar={salvarEdicaoPessoas}
        />
      )}

      <ModalCompraCreditos
        aberto={modalCompraAberto}
        onFechar={() => setModalCompraAberto(false)}
      />

      <AuthModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </main>
  );
}
