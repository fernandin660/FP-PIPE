"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { criarClienteSupabase } from "../../lib/supabase/client";
import Sidebar from "../../components/Sidebar";
import ModalPerfil, {
  type PerfilVendedor,
} from "../../components/ModalPerfil";

type ContatoEncontrado = {
  id?: string;
  company_id?: string | null;
  linkedin_url?: string | null;
  nome: string | null;
  cargo: string | null;
  empresa: string | null;
  email: string;
  emails?: string[];
  telefones?: string[];
  origem?: "lista" | "contato";
  matchScore?: number | null;
  matchMotivos?: string[];
};

type EmpresaResumida = {
  id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function AtribuirLead({
  contatoId,
  empresas,
  aoVincular,
}: {
  contatoId: string;
  empresas: EmpresaResumida[];
  aoVincular?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<string | null>(null);

  const termo = normalizar(busca.trim());

  const sugestoes =
    termo.length === 0
      ? empresas.slice(0, 5)
      : empresas
          .filter((empresa) =>
            normalizar(
              `${empresa.nome_fantasia ?? ""} ${empresa.razao_social ?? ""}`
            ).includes(termo)
          )
          .slice(0, 6);

  const atribuir = async (empresa: EmpresaResumida) => {
    if (enviando) return;

    setEnviando(true);

    try {
      const resposta = await fetch("/api/buscar-contato", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contatoId, companyId: empresa.id }),
      });

      if (resposta.ok) {
        setConcluido(empresa.nome_fantasia || empresa.razao_social || "lead");
        setAberto(false);
        setBusca("");
        aoVincular?.();
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((valor) => !valor)}
        title="Vincular este contato a um lead da sua lista"
        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
          concluido
            ? "border-pipe-lime/40 text-pipe-lime"
            : "border-pipe-border text-gray-300 hover:bg-pipe-dark"
        }`}
      >
        {concluido ? `📎 ${concluido}` : "📎 Adicionar a lead existente"}
      </button>

      {aberto && (
        <div className="absolute right-0 bottom-full mb-2 z-30 w-72 bg-pipe-card border border-pipe-border rounded-xl p-3 shadow-2xl">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o nome do lead..."
            autoFocus
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
          />

          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {sugestoes.map((empresa) => (
              <button
                key={empresa.id}
                onClick={() => atribuir(empresa)}
                disabled={enviando}
                className="w-full text-left text-xs text-gray-200 px-3 py-2 rounded-lg hover:bg-pipe-dark disabled:opacity-50 transition truncate"
              >
                {empresa.nome_fantasia ||
                  empresa.razao_social ||
                  "Lead sem nome"}
              </button>
            ))}

            {sugestoes.length === 0 && (
              <p className="text-xs text-pipe-muted px-3 py-2">
                Nenhum lead encontrado.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CadastrarComoLead({ contato }: { contato: ContatoEncontrado }) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const [listas, setListas] = useState<{ id: string; nome: string }[]>([]);
  const [modoLista, setModoLista] = useState<"nova" | "existente">("nova");
  const [novaListaNome, setNovaListaNome] = useState("");
  const [listaEscolhida, setListaEscolhida] = useState("");

  const carregarListas = async () => {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    const { data } = await supabase
      .from("listas")
      .select("id, nome")
      .order("criado_em", { ascending: false });

    setListas((data as { id: string; nome: string }[]) ?? []);
  };

  const abrirPainel = () => {
    const proximoAberto = !aberto;
    setAberto(proximoAberto);

    if (proximoAberto) {
      void carregarListas();
      if (!novaListaNome.trim()) {
        setNovaListaNome(
          `Buscador — ${contato.empresa || "sem empresa"}`
        );
      }
    }
  };

  const cadastrar = async () => {
    if (enviando) return;

    if (modoLista === "existente" && !listaEscolhida) {
      setErro("Escolha uma lista ou crie uma nova.");
      return;
    }

    setEnviando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/cadastrar-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: contato.nome,
          cargo: contato.cargo,
          empresa: contato.empresa,
          email: contato.email,
          linkedinUrl: contato.linkedin_url ?? "",
          listaId:
            modoLista === "existente" ? listaEscolhida : undefined,
          novaListaNome:
            modoLista === "nova" ? novaListaNome : undefined,
        }),
      });

      const dados = (await resposta.json()) as {
        ok?: boolean;
        comCnpj?: boolean;
        razaoSocial?: string;
        listaNome?: string | null;
        erro?: string;
      };

      if (!resposta.ok || !dados.ok) {
        setErro(dados.erro ?? "Falha ao cadastrar.");
        return;
      }

      setFeito(
        `${dados.razaoSocial || contato.empresa || "Lead"}${
          dados.comCnpj ? " (com CNPJ)" : ""
        }${
          dados.listaNome ? ` → ${dados.listaNome}` : ""
        }`
      );
      setAberto(false);
    } finally {
      setEnviando(false);
    }
  };

  if (feito) {
    return (
      <div className="relative">
        <a
          href="/listas"
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-pipe-lime/40 text-pipe-lime inline-block"
          title="Lead criado — abrir Minhas listas"
        >
          🏢 {feito} ↗
        </a>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={abrirPainel}
        title="Criar um lead novo no banco com esta empresa e este contato"
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-pipe-border text-gray-300 hover:bg-pipe-dark transition"
      >
        🏢 Cadastrar como lead
      </button>

      {aberto && (
        <div className="absolute right-0 bottom-full mb-2 z-30 w-72 bg-pipe-card border border-pipe-border rounded-xl p-3 shadow-2xl space-y-2">
          <p className="text-[11px] text-pipe-muted leading-relaxed">
            Vamos procurar{" "}
            <span className="text-white font-semibold">
              {contato.empresa || "a empresa"}
            </span>{" "}
            na Receita Federal pelo nome. Se não achar, salvamos o lead com os
            dados do LinkedIn mesmo.
          </p>

          <div className="flex items-center gap-3 text-[11px] font-semibold pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={modoLista === "nova"}
                onChange={() => setModoLista("nova")}
              />
              Nova lista
            </label>

            <label
              className={`flex items-center gap-1.5 cursor-pointer ${
                listas.length === 0 ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <input
                type="radio"
                checked={modoLista === "existente"}
                onChange={() => setModoLista("existente")}
              />
              Lista existente
            </label>
          </div>

          {modoLista === "nova" ? (
            <input
              value={novaListaNome}
              onChange={(e) => setNovaListaNome(e.target.value)}
              placeholder="Nome da nova lista"
              className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
            />
          ) : (
            <select
              value={listaEscolhida}
              onChange={(e) => setListaEscolhida(e.target.value)}
              className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
            >
              <option value="">
                {listas.length === 0
                  ? "Nenhuma lista ainda..."
                  : "Escolher lista..."}
              </option>

              {listas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          )}

          {erro && <p className="text-[11px] text-red-400">{erro}</p>}

          <button
            onClick={() => void cadastrar()}
            disabled={enviando}
            className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-pipe-lime text-black hover:opacity-90 disabled:opacity-50 transition"
          >
            {enviando
              ? "Buscando CNPJ e criando lead..."
              : "✅ Confirmar cadastro"}
          </button>
        </div>
      )}
    </div>
  );
}

function BuscadorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDaExtensao = searchParams.get("url") ?? "";

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [saldoContatos, setSaldoContatos] = useState<number | null>(null);
  const [saldoTelefones, setSaldoTelefones] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  const [urlLinkedin, setUrlLinkedin] = useState("");
  const [empresaInput, setEmpresaInput] = useState("");
  const [nomeInput, setNomeInput] = useState("");
  const [leadSelecionado, setLeadSelecionado] = useState<string>("");
  const [leads, setLeads] = useState<ContatoEncontrado[]>([]);
  const [resultadosBusca, setResultadosBusca] = useState<ContatoEncontrado[]>([]);
  const [buscandoLead, setBuscandoLead] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [leadNaoEncontrado, setLeadNaoEncontrado] = useState(false);
  const [resultadosEmpresa, setResultadosEmpresa] = useState<{ id: string; nome: string; cnpj: string | null }[]>([]);
  const [resultadosEmpresaWeb, setResultadosEmpresaWeb] = useState<{ cnpj: string; razao_social: string; nome_fantasia: string }[]>([]);
  const [buscandoEmpresa, setBuscandoEmpresa] = useState(false);
  const [buscandoEmpresaWeb, setBuscandoEmpresaWeb] = useState(false);
  const [mostrarResultadosEmpresa, setMostrarResultadosEmpresa] = useState(false);
  const [empresaWebBuscada, setEmpresaWebBuscada] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceEmpresaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tipoBusca, setTipoBusca] = useState<"email" | "telefone" | "both">("both");
  const [buscando, setBuscando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erroMensagem, setErroMensagem] = useState(false);
  const [resultado, setResultado] = useState<ContatoEncontrado | null>(null);
  const [emailsEncontrados, setEmailsEncontrados] = useState<string[]>([]);
  const [telefonesEncontrados, setTelefonesEncontrados] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [historico, setHistorico] = useState<ContatoEncontrado[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaResumida[]>([]);

  const [objetivoContato, setObjetivoContato] = useState("");
  const [canalContato, setCanalContato] = useState("");
  const [orientacoesContato, setOrientacoesContato] = useState("");
  const [gerandoAbordagem, setGerandoAbordagem] = useState(false);
  const [erroAbordagem, setErroAbordagem] = useState("");
  const [abordagemContato, setAbordagemContato] = useState<{
    argumento: string | null;
    assunto: string | null;
    conteudo: string;
    canal: string;
  } | null>(null);
  const [copiadoAbordagem, setCopiadoAbordagem] = useState(false);
  const [veioDoCache, setVeioDoCache] = useState(false);
  const autoBuscouRef = useRef(false);
  const pendenteAutoBusca = useRef<string | null>(null);

  const [fichaEmpresa, setFichaEmpresa] = useState<{
    nome: string;
    cnpj: string | null;
    razao_social: string | null;
    endereco: string | null;
    telefone_empresa: string | null;
    telefones_empresa: string[];
    website: string | null;
    linkedin_url: string | null;
    emails_genericos: string[];
    fontes: string[];
    origem: "banco" | "web";
  } | null>(null);
  const [buscandoEmpresaFicha, setBuscandoEmpresaFicha] = useState(false);
  const [linkedinPessoa, setLinkedinPessoa] = useState("");
  const [nomePessoaInput, setNomePessoaInput] = useState("");
  const [expandidoPessoa, setExpandidoPessoa] = useState(false);
  const [drawerPessoa, setDrawerPessoa] = useState(false);
  const [buscandoPessoa, setBuscandoPessoa] = useState(false);
  const [resultadoPessoa, setResultadoPessoa] = useState<{
    id: string | null;
    nome: string | null;
    email: string | null;
    cargo: string | null;
    empresa: string | null;
    linkedin_url: string | null;
    telefones: string[];
    emails: string[];
    fontesEmail: string[];
    fontesTelefone: string[];
    matchScore: number | null;
    matchMotivos: string[];
    empresaDetalhes: {
      cnpj: string | null;
      razao_social: string | null;
      endereco: string | null;
      telefone_empresa: string | null;
      website: string | null;
      linkedin_url: string | null;
      emails_genericos: string[];
    } | null;
  } | null>(null);
  const [erroPessoa, setErroPessoa] = useState("");
  const [mostrarPopupMillionPhones, setMostrarPopupMillionPhones] = useState(false);

  const carregarHistorico = useCallback(
    async (idUsuario?: string) => {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      let usuarioId = idUsuario;

      if (!usuarioId) {
        const { data } = await supabase.auth.getUser();
        usuarioId = data.user?.id;
      }

      if (!usuarioId) return;

      const { data: contatos } = await supabase
        .from("contatos")
        .select("id, company_id, linkedin_url, nome, cargo, empresa, email")
        .order("criado_em", { ascending: false })
        .limit(30);

      setHistorico((contatos as ContatoEncontrado[]) ?? []);
    },
    []
  );

  useEffect(() => {
    async function carregar() {
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
        .select(
          "nome_empresa, area_atuacao, departamento_uso, produtos_servicos, site, foto_url, anexos, nichos"
        )
        .eq("usuario_id", user.id)
        .maybeSingle();

      setPerfil((dadosPerfil as PerfilVendedor) ?? null);

      const { data: dadosCreditos } = await supabase
        .from("creditos")
        .select("saldo")
        .eq("usuario_id", user.id)
        .maybeSingle();

      setSaldoCreditos(dadosCreditos?.saldo ?? null);

      const { data: dadosContatos } = await supabase
        .from("creditos_contatos")
        .select("saldo")
        .eq("usuario_id", user.id)
        .maybeSingle();

      setSaldoContatos(dadosContatos?.saldo ?? 5);

      const { data: orgData } = await supabase
        .from("organizacao_membros")
        .select("organizacao_id")
        .eq("usuario_id", user.id)
        .single();

      if (orgData) {
        const { data: dadosTelefone } = await supabase
          .from("creditos_telefone")
          .select("saldo")
          .eq("organizacao_id", orgData.organizacao_id)
          .maybeSingle();
        setSaldoTelefones(dadosTelefone?.saldo ?? 0);
      }

      const { data: dadosEmpresas } = await supabase
        .from("companies")
        .select("id, nome_fantasia, razao_social")
        .order("criado_em", { ascending: false })
        .limit(300);

      setEmpresas((dadosEmpresas as EmpresaResumida[]) ?? []);

      const { data: dadosLeads } = await supabase
        .from("contatos")
        .select("id, linkedin_url, nome, cargo, empresa, email")
        .order("criado_em", { ascending: false })
        .limit(100);

      setLeads((dadosLeads as ContatoEncontrado[]) ?? []);

      await carregarHistorico(user.id);

      setCarregando(false);

      if (urlDaExtensao && !autoBuscouRef.current) {
        autoBuscouRef.current = true;
        pendenteAutoBusca.current = urlDaExtensao;
        setUrlLinkedin(urlDaExtensao);
      }
    }

    carregar();
  }, [router, carregarHistorico, urlDaExtensao]);

  const selecionarLead = (leadId: string) => {
    setLeadSelecionado(leadId);
    setMostrarResultados(false);
    setLeadNaoEncontrado(false);
    if (!leadId) {
      setUrlLinkedin("");
      setEmpresaInput("");
      setNomeInput("");
      return;
    }
    const lead = leads.find((l) => l.id === leadId)
      ?? resultadosBusca.find((l) => l.id === leadId);
    if (lead) {
      setUrlLinkedin(lead.linkedin_url ?? "");
      setEmpresaInput(lead.empresa ?? "");
      setNomeInput(lead.nome ?? "");
      setTermoBusca("");
    }
  };

  const buscarLeads = useCallback(async (termo: string) => {
    if (termo.length < 2) {
      setResultadosBusca([]);
      setMostrarResultados(false);
      setLeadNaoEncontrado(false);
      return;
    }

    setBuscandoLead(true);
    try {
      const res = await fetch(`/api/buscar-lead?q=${encodeURIComponent(termo)}`);
      const dados = (await res.json()) as { resultados?: ContatoEncontrado[] };
      const resultados = dados.resultados ?? [];
      setResultadosBusca(resultados);
      setMostrarResultados(true);
      setLeadNaoEncontrado(resultados.length === 0);
    } catch {
      setResultadosBusca([]);
      setMostrarResultados(true);
      setLeadNaoEncontrado(true);
    } finally {
      setBuscandoLead(false);
    }
  }, []);

  const aoDigitarBusca = (valor: string) => {
    setTermoBusca(valor);
    setLeadSelecionado("");
    setLeadNaoEncontrado(false);
    setUrlLinkedin("");
    setEmpresaInput("");
    setNomeInput("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void buscarLeads(valor);
    }, 300);
  };

  const buscarEmpresas = useCallback(async (termo: string) => {
    if (termo.length < 2) {
      setResultadosEmpresa([]);
      setResultadosEmpresaWeb([]);
      setMostrarResultadosEmpresa(false);
      setEmpresaWebBuscada(false);
      return;
    }
    setBuscandoEmpresa(true);
    setEmpresaWebBuscada(false);
    setResultadosEmpresaWeb([]);
    try {
      const cli = criarClienteSupabase();
      if (!cli) return;

      const termoLower = `%${termo}%`;
      const { data: userAuth } = await cli.auth.getUser();
      if (!userAuth.user) return;

      const { data: orgData } = await cli
        .from("organizacao_membros")
        .select("organizacao_id")
        .eq("usuario_id", userAuth.user.id)
        .single();

      if (!orgData) return;

      const { data } = await cli
        .from("companies")
        .select("id, nome_fantasia, razao_social, cnpj")
        .eq("organizacao_id", orgData.organizacao_id)
        .or(`nome_fantasia.ilike.${termoLower},razao_social.ilike.${termoLower}`)
        .order("nome_fantasia")
        .limit(8);

      const resultados = (data ?? []).map((e: { id: string; nome_fantasia: string | null; razao_social: string | null; cnpj: string | null }) => ({
        id: e.id,
        nome: e.nome_fantasia || e.razao_social || "",
        cnpj: e.cnpj ?? null,
      }));
      setResultadosEmpresa(resultados);
      setMostrarResultadosEmpresa(true);
    } catch {
      setResultadosEmpresa([]);
    } finally {
      setBuscandoEmpresa(false);
    }
  }, []);

  const buscarEmpresaWeb = async (termo: string) => {
    if (termo.length < 2) return;
    setBuscandoEmpresaWeb(true);
    setEmpresaWebBuscada(true);
    try {
      const res = await fetch(`/api/buscar-empresa-web?q=${encodeURIComponent(termo)}`);
      const dados = (await res.json()) as {
        resultados?: { cnpj: string; razao_social: string; nome_fantasia: string }[];
      };
      setResultadosEmpresaWeb(dados.resultados ?? []);
      setMostrarResultadosEmpresa(true);
    } catch {
      setResultadosEmpresaWeb([]);
    } finally {
      setBuscandoEmpresaWeb(false);
    }
  };

  const aoDigitarEmpresa = (valor: string) => {
    setEmpresaInput(valor);
    setMostrarResultadosEmpresa(false);
    setResultadosEmpresaWeb([]);
    setEmpresaWebBuscada(false);
    if (debounceEmpresaRef.current) clearTimeout(debounceEmpresaRef.current);
    debounceEmpresaRef.current = setTimeout(() => {
      void buscarEmpresas(valor);
    }, 300);
  };

  const selecionarEmpresa = (nome: string) => {
    setEmpresaInput(nome);
    setMostrarResultadosEmpresa(false);
    setResultadosEmpresaWeb([]);
    setEmpresaWebBuscada(false);
  };

  const temInput = Boolean(urlLinkedin.trim() || empresaInput.trim() || nomeInput.trim());

  const buscar = async () => {
    const urlFinal = urlLinkedin.trim() || pendenteAutoBusca.current || "";
    pendenteAutoBusca.current = null;

    if (buscando) return;
    if (!urlFinal && !empresaInput.trim()) return;

    setBuscando(true);
    setMensagem("");
    setErroMensagem(false);
    setResultado(null);
    setCopiado(false);
    setAbordagemContato(null);
    setErroAbordagem("");
    setVeioDoCache(false);

    try {
      const resposta = await fetch("/api/buscar-contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: urlFinal,
          empresa: empresaInput.trim(),
          nome: nomeInput.trim(),
          tipo: tipoBusca,
        }),
      });

      const dados = (await resposta.json()) as {
        encontrado?: boolean;
        doCache?: boolean;
        contato?: ContatoEncontrado;
        emails?: string[];
        telefones?: string[];
        matchScore?: number | null;
        matchMotivos?: string[];
        saldoTelefones?: number;
        saldoContatos?: number;
        mensagem?: string;
        erro?: string;
      };

      if (!resposta.ok) {
        setErroMensagem(true);
        setMensagem(dados.erro ?? "Não foi possível concluir a busca.");
        return;
      }

      if (dados.encontrado && dados.contato) {
        setResultado({ ...dados.contato, matchScore: dados.matchScore, matchMotivos: dados.matchMotivos ?? [] });
        if (dados.saldoTelefones !== undefined) {
          setSaldoTelefones(dados.saldoTelefones);
        }
        setVeioDoCache(Boolean(dados.doCache));
        setEmailsEncontrados(dados.emails ?? []);
        setTelefonesEncontrados(dados.telefones ?? []);
        setUrlLinkedin("");

        const supabase = criarClienteSupabase();
        const {
          data: { user },
        } = (await supabase?.auth.getUser()) ?? {
          data: { user: null },
        };
        if (supabase && user) await carregarHistorico(user.id);
      } else {
        setErroMensagem(false);
        setMensagem(dados.mensagem ?? "Nenhum e-mail encontrado.");
      }
    } catch {
      setErroMensagem(true);
      setMensagem("Falha de conexão. Tente novamente.");
    } finally {
      setBuscando(false);
    }
  };

  const copiarEmail = async () => {
    if (!resultado) return;

    try {
      await navigator.clipboard.writeText(resultado.email);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      console.error("Não conseguimos copiar o e-mail.");
    }
  };

  const buscarEmpresaFicha = async (termo: string) => {
    if (!termo.trim() || buscandoEmpresaFicha) return;

    setBuscandoEmpresaFicha(true);
    setFichaEmpresa(null);
    setResultadoPessoa(null);
    setErroPessoa("");

    try {
      const res = await fetch(`/api/buscar-empresa?q=${encodeURIComponent(termo.trim())}`);
      const dados = (await res.json()) as {
        empresa?: {
          nome: string;
          cnpj: string | null;
          razao_social: string | null;
          endereco: string | null;
          telefone_empresa: string | null;
          telefones_empresa: string[];
          website: string | null;
          linkedin_url: string | null;
          emails_genericos: string[];
          fontes: string[];
          origem: "banco" | "web";
        };
        erro?: string;
      };

      if (!res.ok) {
        setMensagem(dados.erro ?? "Erro ao buscar empresa.");
        setErroMensagem(true);
        return;
      }

      if (dados.empresa) {
        let empresaFinal = dados.empresa;

        if (empresaFinal.cnpj && !empresaFinal.telefone_empresa) {
          try {
            const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${empresaFinal.cnpj}`, { signal: AbortSignal.timeout(6000) });
            if (resBrasil.ok) {
              const brasil = await resBrasil.json() as { ddd_telefone_1?: string; ddd_telefone_2?: string; nome?: string; email?: string };
              const tel1 = typeof brasil.ddd_telefone_1 === "string" ? brasil.ddd_telefone_1.trim() : "";
              if (tel1) {
                empresaFinal = { ...empresaFinal, telefone_empresa: tel1 };
              } else if (typeof brasil.ddd_telefone_2 === "string" && brasil.ddd_telefone_2.trim()) {
                empresaFinal = { ...empresaFinal, telefone_empresa: brasil.ddd_telefone_2.trim() };
              }
            }
          } catch {}
        }

        setFichaEmpresa(empresaFinal);
        setMensagem("");
      }
    } catch {
      setMensagem("Falha de conexão ao buscar empresa.");
      setErroMensagem(true);
    } finally {
      setBuscandoEmpresaFicha(false);
    }
  };

  const buscarPessoa = async () => {
    if (buscandoPessoa) return;

    setBuscandoPessoa(true);
    setResultadoPessoa(null);
    setErroPessoa("");
    setExpandidoPessoa(false);
    setDrawerPessoa(false);

    try {
      const nomeEmpresa = fichaEmpresa?.nome ?? "";

      const resPessoa = await fetch("/api/buscar-contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: linkedinPessoa.trim() || undefined,
          empresa: nomeEmpresa,
          nome: nomePessoaInput.trim(),
          tipo: "telefone",
        }),
      });

      const dados = (await resPessoa.json()) as {
        encontrado?: boolean;
        contato?: { id?: string; nome: string | null; email: string | null; cargo: string | null; empresa: string | null; linkedin_url: string | null };
        emails?: string[];
        telefones?: string[];
        fontesEmail?: string[];
        fontesTelefone?: string[];
        saldoTelefones?: number;
        matchScore?: number | null;
        matchMotivos?: string[];
        erro?: string;
      };

      if (!resPessoa.ok) {
        if (resPessoa.status === 402) {
          setMostrarPopupMillionPhones(true);
        } else {
          setErroPessoa(dados.erro ?? "Erro ao buscar pessoa.");
        }
        return;
      }

      const empresaNome = dados.contato?.empresa ?? fichaEmpresa?.nome ?? nomeEmpresa ?? null;

      let empresaDados: {
        nome: string;
        cnpj: string | null;
        razao_social: string | null;
        endereco: string | null;
          telefone_empresa: string | null;
          telefones_empresa: string[];
        website: string | null;
        linkedin_url: string | null;
        emails_genericos: string[];
      } | null = null;

      if (empresaNome) {
        try {
          const resEmpresa = await fetch(`/api/buscar-empresa?q=${encodeURIComponent(empresaNome)}`);
          const dadosEmpresa = (await resEmpresa.json()) as { empresa?: { nome: string; cnpj: string | null; razao_social: string | null; endereco: string | null; telefone_empresa: string | null; telefones_empresa: string[]; website: string | null; linkedin_url: string | null; emails_genericos: string[]; fontes: string[]; origem: "banco" | "web" }; erro?: string };
          if (resEmpresa.ok && dadosEmpresa.empresa) {
            let e = dadosEmpresa.empresa;
            if (e.cnpj && !e.telefone_empresa) {
              try {
                const resBrasil = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${e.cnpj}`, { signal: AbortSignal.timeout(6000) });
                if (resBrasil.ok) {
                  const brasil = await resBrasil.json() as { ddd_telefone_1?: string; ddd_telefone_2?: string };
                  const tel1 = typeof brasil.ddd_telefone_1 === "string" ? brasil.ddd_telefone_1.trim() : "";
                  if (tel1) {
                    e = { ...e, telefone_empresa: tel1 };
                  } else if (typeof brasil.ddd_telefone_2 === "string" && brasil.ddd_telefone_2.trim()) {
                    e = { ...e, telefone_empresa: brasil.ddd_telefone_2.trim() };
                  }
                }
              } catch {}
            }
            empresaDados = e;
            setFichaEmpresa(e);
          } else {
            empresaDados = fichaEmpresa;
          }
        } catch {
          empresaDados = fichaEmpresa;
        }
      } else {
        empresaDados = fichaEmpresa;
      }

      const empresaDetalhes = empresaDados ? {
        cnpj: empresaDados.cnpj ?? null,
        razao_social: empresaDados.razao_social ?? null,
        endereco: empresaDados.endereco ?? null,
        telefone_empresa: empresaDados.telefone_empresa ?? null,
        telefones_empresa: empresaDados.telefones_empresa ?? [],
        website: empresaDados.website ?? null,
        linkedin_url: empresaDados.linkedin_url ?? null,
        emails_genericos: empresaDados.emails_genericos ?? [],
      } : null;

      if (dados.encontrado && dados.contato) {
        setResultadoPessoa({
          id: dados.contato.id ?? null,
          nome: dados.contato.nome ?? null,
          email: dados.contato.email ?? null,
          cargo: dados.contato.cargo ?? null,
          empresa: dados.contato.empresa ?? empresaNome ?? null,
          linkedin_url: dados.contato.linkedin_url ?? linkedinPessoa.trim(),
          telefones: dados.telefones ?? [],
          emails: dados.emails ?? [],
          matchScore: dados.matchScore ?? null,
          matchMotivos: dados.matchMotivos ?? [],
          fontesEmail: dados.fontesEmail ?? [],
          fontesTelefone: dados.fontesTelefone ?? [],
          empresaDetalhes,
        });
        if (dados.saldoTelefones !== undefined) {
          setSaldoTelefones(dados.saldoTelefones);
        }
      } else {
        setResultadoPessoa({
          id: null,
          nome: nomePessoaInput.trim() || null,
          email: null,
          cargo: null,
          empresa: empresaNome,
          linkedin_url: linkedinPessoa.trim() || null,
          telefones: [],
          emails: [],
          matchScore: null,
          matchMotivos: [],
          fontesEmail: [],
          fontesTelefone: [],
          empresaDetalhes,
        });
        setErroPessoa("Nenhum contato pessoal encontrado para este perfil.");
      }
    } catch {
      setErroPessoa("Falha de conexão. Tente novamente.");
    } finally {
      setBuscandoPessoa(false);
    }
  };

  const gerarAbordagemContato = async () => {
    if (
      !resultado?.id ||
      gerandoAbordagem ||
       !objetivoContato
    ) {
      return;
    }

    setGerandoAbordagem(true);
    setErroAbordagem("");
    setAbordagemContato(null);
    setCopiadoAbordagem(false);

    try {
      const resposta = await fetch("/api/gerar-abordagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contatoId: resultado.id,
          produto: "__portfolio__",
          objetivo: objetivoContato,
           canal: "email",
           instrucoes: orientacoesContato,
        }),
      });

      const dados = (await resposta.json()) as {
        abordagem?: {
          argumento: string | null;
          assunto: string | null;
          conteudo: string;
          canal: string;
        };
        erro?: string;
      };

      if (!resposta.ok || !dados.abordagem) {
        setErroAbordagem(dados.erro ?? "Não conseguimos gerar agora.");
        return;
      }

      setAbordagemContato(dados.abordagem);
    } catch {
      setErroAbordagem("Falha de conexão. Tente novamente.");
    } finally {
      setGerandoAbordagem(false);
    }
  };

  const copiarAbordagem = async () => {
    if (!abordagemContato) return;

    try {
      const texto =
        abordagemContato.canal === "email" && abordagemContato.assunto
          ? `${abordagemContato.assunto}\n\n${abordagemContato.conteudo}`
          : abordagemContato.conteudo;

      await navigator.clipboard.writeText(texto);
      setCopiadoAbordagem(true);
      setTimeout(() => setCopiadoAbordagem(false), 2000);
    } catch {
      console.error("Não conseguimos copiar.");
    }
  };

  return (
    <>
      <Sidebar
        perfil={perfil}
        saldoCreditos={saldoCreditos}
        aoAbrirPerfil={() => setModalPerfilAberto(true)}
      />

      <ModalPerfil
        key={`perfil-buscador-${modalPerfilAberto}-${perfil?.produtos_servicos ? "ok" : "vazio"}`}
        aberto={modalPerfilAberto}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={setPerfil}
      />

      <main className="min-h-screen bg-pipe-dark px-6 py-12 lg:pl-72">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/prospeccao" className="font-display text-3xl text-white">
              FP <span className="text-pipe-lime">Pipe</span>
            </Link>

            <Link
              href="/prospeccao"
              className="bg-pipe-lime text-black font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition text-sm"
            >
              + Nova prospecção
            </Link>
          </div>

          <div className="flex items-end justify-between mt-10 gap-4 flex-wrap">
            <h1 className="font-display text-5xl text-white">
              Buscador de contatos
            </h1>

            {saldoContatos !== null && (
              <p className="text-pipe-muted text-sm">
                🔎 E-mails:{" "}
                <span className="text-pipe-lime font-bold">{saldoContatos}</span>
              </p>
            )}

            {saldoTelefones !== null && saldoTelefones > 0 && (
              <p className="text-pipe-muted text-sm">
                📞 Telefones:{" "}
                <span className="text-pipe-lime font-bold">{saldoTelefones}</span>
                <span className="text-[10px] text-pipe-muted ml-1">
                  ({saldoTelefones} disponíveis)
                </span>
              </p>
            )}
          </div>

          <p className="text-pipe-muted mt-3 max-w-2xl">
            Busque uma empresa para ver telefones e e-mails gerais (grátis).{" "}
            Depois, cole o LinkedIn de um funcionário para buscar o{" "}
             <strong className="text-gray-200">telefone pessoal</strong> (1 crédito).
          </p>

          <div className="mt-8 bg-pipe-card border border-pipe-border rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-pipe-muted uppercase tracking-wide mb-2">
                Buscar empresa
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void buscarEmpresaFicha(termoBusca);
                  }}
                  placeholder="Digite o nome da empresa (ex: Sal Express, Petrobras...)"
                  className="flex-1 bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                  disabled={buscandoEmpresaFicha}
                />
                <button
                  onClick={() => void buscarEmpresaFicha(termoBusca)}
                  disabled={buscandoEmpresaFicha || termoBusca.length < 2}
                  className="bg-pipe-lime text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm whitespace-nowrap"
                >
                  {buscandoEmpresaFicha ? "🔍 Buscando..." : "🔎 Buscar empresa"}
                </button>
              </div>
            </div>

            {mensagem && (
              <p className={`text-sm ${erroMensagem ? "text-red-400" : "text-amber-400"}`}>
                {mensagem}
              </p>
            )}
          </div>

          {fichaEmpresa && (
            <div className="mt-6 bg-pipe-card border border-pipe-border rounded-xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏢</span>
                    <h2 className="font-display text-xl text-white">{fichaEmpresa.nome}</h2>
                    <span className="text-[10px] text-pipe-muted bg-pipe-dark px-2 py-0.5 rounded-full">
                      {fichaEmpresa.origem === "banco" ? "📋 Seus dados" : "🌐 Web"}
                    </span>
                  </div>
                  {fichaEmpresa.razao_social && fichaEmpresa.razao_social !== fichaEmpresa.nome && (
                    <p className="text-xs text-pipe-muted mt-1">{fichaEmpresa.razao_social}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fichaEmpresa.cnpj && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-pipe-muted">CNPJ:</span>
                    <span className="text-white font-mono">{fichaEmpresa.cnpj}</span>
                  </div>
                )}
                {fichaEmpresa.endereco && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-pipe-muted">📍</span>
                    <span className="text-white">{fichaEmpresa.endereco}</span>
                  </div>
                )}
                {fichaEmpresa.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-pipe-muted">🌐</span>
                    <a href={fichaEmpresa.website} target="_blank" rel="noopener noreferrer" className="text-pipe-lime hover:underline">
                      {fichaEmpresa.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </div>
                )}
                {fichaEmpresa.linkedin_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-pipe-muted">💼</span>
                    <a href={fichaEmpresa.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      LinkedIn da empresa
                    </a>
                  </div>
                )}
              </div>

              {(fichaEmpresa.telefones_empresa?.length > 0 || fichaEmpresa.telefone_empresa) && (
                <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                  <p className="text-[10px] text-pipe-muted uppercase tracking-wide mb-1">Telefone da empresa</p>
                  <div className="space-y-1">
                    {[...(fichaEmpresa.telefones_empresa ?? []), ...(fichaEmpresa.telefone_empresa && !(fichaEmpresa.telefones_empresa ?? []).includes(fichaEmpresa.telefone_empresa) ? [fichaEmpresa.telefone_empresa] : [])].map((telefone) => (
                      <div key={telefone} className="flex items-center gap-2">
                        <a href={`tel:${telefone}`} className="text-pipe-lime font-semibold hover:underline text-sm">📞 {telefone}</a>
                        <span className="text-[10px] text-pipe-muted">Grátis</span>
                        <button onClick={async () => { await navigator.clipboard.writeText(telefone); }} className="text-xs text-pipe-muted hover:text-white transition" title="Copiar">📋</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fichaEmpresa.emails_genericos.length > 0 && (
                <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
                  <p className="text-[10px] text-pipe-muted uppercase tracking-wide mb-1">E-mails gerais da empresa</p>
                  <div className="space-y-1">
                    {fichaEmpresa.emails_genericos.map((email) => (
                      <div key={email} className="flex items-center gap-2">
                        <a href={`mailto:${email}`} className="text-pipe-lime text-sm hover:underline">
                          {email}
                        </a>
                        <button
                          onClick={async () => { await navigator.clipboard.writeText(email); }}
                          className="text-xs text-pipe-muted hover:text-white transition"
                          title="Copiar"
                        >
                          📋
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-pipe-muted mt-1 italic">⚠️ E-mails genéricos — confira antes de usar</p>
                </div>
              )}

              {!fichaEmpresa.telefone_empresa && !(fichaEmpresa.telefones_empresa?.length) && fichaEmpresa.emails_genericos.length === 0 && (
                <p className="text-sm text-pipe-muted">
                  Nenhum telefone ou e-mail encontrado para esta empresa. Tente buscar por outro nome.
                </p>
              )}

              <div className="border-t border-pipe-border pt-4">
                <p className="text-xs font-semibold text-pipe-muted uppercase tracking-wide mb-3">
                  👤 Buscar contato pessoa
                </p>
                <p className="text-[11px] text-pipe-muted mb-3">
                  Informe o nome da pessoa. O LinkedIn é opcional (melhora a precisão).
                  {saldoTelefones !== null && saldoTelefones > 0
                    ? ` Custo: 1 crédito de telefone (você tem ${saldoTelefones}).`
                    : " Sempre grátis se não encontrar telefone."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={nomePessoaInput}
                    onChange={(e) => setNomePessoaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void buscarPessoa();
                    }}
                    placeholder="Nome da pessoa (ex: Kelder Nagel)"
                    className="bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                    disabled={buscandoPessoa}
                  />
                  <input
                    type="url"
                    value={linkedinPessoa}
                    onChange={(e) => setLinkedinPessoa(e.target.value)}
                    placeholder="LinkedIn (opcional)"
                    className="bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                    disabled={buscandoPessoa}
                  />
                </div>
                <button
                  onClick={() => void buscarPessoa()}
                  disabled={buscandoPessoa}
                  className="mt-3 bg-pipe-blue text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm"
                >
                   {buscandoPessoa ? "🔍 Buscando..." : saldoTelefones !== null && saldoTelefones > 0 ? "📞 Buscar pessoa (1 créd)" : "📞 Buscar pessoa (grátis se não achar tel.)"}
                </button>

                {erroPessoa && (
                  <p className="mt-2 text-sm text-red-400">{erroPessoa}</p>
                )}

                {resultadoPessoa && (
                  <>
                    <button
                      onClick={() => setDrawerPessoa(true)}
                      className="mt-4 w-full bg-pipe-dark border border-pipe-lime/30 rounded-lg p-4 text-left hover:bg-white/[0.03] transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white truncate group-hover:text-pipe-lime transition">
                            {resultadoPessoa.nome || fichaEmpresa?.nome || "Contato"}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {resultadoPessoa.cargo && (
                              <span className="text-xs text-pipe-muted">{resultadoPessoa.cargo}</span>
                            )}
                            {(resultadoPessoa.empresa || fichaEmpresa?.nome) && (
                              <>
                                <span className="text-pipe-muted">·</span>
                                <span className="text-xs text-pipe-muted">{resultadoPessoa.empresa || fichaEmpresa?.nome}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {resultadoPessoa.matchScore !== null && resultadoPessoa.matchScore !== undefined && (
                              <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${resultadoPessoa.matchScore >= 70 ? "text-green-300 bg-green-500/15" : resultadoPessoa.matchScore >= 50 ? "text-yellow-300 bg-yellow-500/15" : "text-gray-300 bg-gray-500/15"}`}>
                                🎯 ICP {resultadoPessoa.matchScore}%
                              </span>
                            )}
                            {fichaEmpresa?.telefone_empresa && (
                              <span className="text-xs text-pipe-muted">📞 empresa</span>
                            )}
                            {resultadoPessoa.telefones.length > 0 && (
                              <span className="text-xs text-pipe-lime font-semibold">
                                📞 pessoal ({resultadoPessoa.telefones.length})
                              </span>
                            )}
                            {!!(resultadoPessoa.emails.length > 0 || fichaEmpresa?.emails_genericos?.length) && (
                              <span className="text-xs text-pipe-lime font-semibold">
                                ✉️ {resultadoPessoa.emails.length + (fichaEmpresa?.emails_genericos?.length ?? 0)} e-mail(s)
                              </span>
                            )}
                            {resultadoPessoa.id && (
                              <span className="text-[10px] text-pipe-lime bg-pipe-lime/10 border border-pipe-lime/30 rounded px-1.5 py-0.5">
                                ✅ Salvo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pt-1">
                          {!resultadoPessoa.id && (
                            <CadastrarComoLead
                              contato={{
                                id: resultadoPessoa.id ?? undefined,
                                company_id: null,
                                nome: resultadoPessoa.nome,
                                cargo: resultadoPessoa.cargo,
                                empresa: resultadoPessoa.empresa,
                                email: resultadoPessoa.email ?? resultadoPessoa.emails[0] ?? "",
                                linkedin_url: resultadoPessoa.linkedin_url,
                              }}
                            />
                          )}
                          <span className="text-xs text-pipe-muted group-hover:text-white transition">Ver mais →</span>
                        </div>
                      </div>
                    </button>

                    {drawerPessoa && (
                      <div className="fixed inset-0 z-50">
                        <div
                          className="absolute inset-0 bg-black/60"
                          onClick={() => setDrawerPessoa(false)}
                        />
                        <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-pipe-card border-l border-pipe-border overflow-y-auto shadow-2xl">
                          <div className="sticky top-0 bg-pipe-card border-b border-pipe-border px-6 py-4 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h2 className="font-bold text-lg text-white leading-snug">
                                {resultadoPessoa.nome || resultadoPessoa.empresa || "Contato"}
                              </h2>
                              {(resultadoPessoa.cargo || resultadoPessoa.empresa) && (
                                <p className="text-xs text-pipe-muted mt-0.5">
                                  {[resultadoPessoa.cargo, resultadoPessoa.empresa].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setDrawerPessoa(false)}
                              className="shrink-0 w-8 h-8 rounded-lg border border-pipe-border text-pipe-muted hover:text-white hover:bg-pipe-dark transition"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="px-6 py-5 space-y-5">
                            {resultadoPessoa.id && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-pipe-lime bg-pipe-lime/10 border border-pipe-lime/30 rounded-lg px-2.5 py-1 font-semibold">
                                  ✅ Salvo nos contatos
                                </span>
                                {!resultadoPessoa.id && (
                                  <CadastrarComoLead
                                    contato={{
                                      id: resultadoPessoa.id ?? undefined,
                                      company_id: null,
                                      nome: resultadoPessoa.nome,
                                      cargo: resultadoPessoa.cargo,
                                      empresa: resultadoPessoa.empresa,
                                      email: resultadoPessoa.email ?? resultadoPessoa.emails[0] ?? "",
                                      linkedin_url: resultadoPessoa.linkedin_url,
                                    }}
                                  />
                                )}
                              </div>
                            )}

                            {resultadoPessoa.linkedin_url && (
                              <a
                                href={resultadoPessoa.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                              >
                                💼 Abrir LinkedIn
                              </a>
                            )}

                            <section>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                                🏢 Empresa
                              </p>
                              <dl className="space-y-1.5 text-sm">
                                {resultadoPessoa.empresaDetalhes?.cnpj && (
                                  <div className="flex gap-2">
                                    <dt className="text-pipe-muted w-28 shrink-0">CNPJ</dt>
                                    <dd className="text-gray-200 font-mono">{resultadoPessoa.empresaDetalhes.cnpj}</dd>
                                  </div>
                                )}
                                {resultadoPessoa.empresaDetalhes?.razao_social && resultadoPessoa.empresaDetalhes.razao_social !== resultadoPessoa.empresa && (
                                  <div className="flex gap-2">
                                    <dt className="text-pipe-muted w-28 shrink-0">Razão social</dt>
                                    <dd className="text-gray-200">{resultadoPessoa.empresaDetalhes.razao_social}</dd>
                                  </div>
                                )}
                                {resultadoPessoa.empresaDetalhes?.endereco && (
                                  <div className="flex gap-2">
                                    <dt className="text-pipe-muted w-28 shrink-0">Endereço</dt>
                                    <dd className="text-gray-200">{resultadoPessoa.empresaDetalhes.endereco}</dd>
                                  </div>
                                )}
                                {resultadoPessoa.empresaDetalhes?.website && (
                                  <div className="flex gap-2">
                                    <dt className="text-pipe-muted w-28 shrink-0">Website</dt>
                                    <dd>
                                      <a href={resultadoPessoa.empresaDetalhes.website} target="_blank" rel="noopener noreferrer" className="text-pipe-lime hover:underline">
                                        {resultadoPessoa.empresaDetalhes.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                      </a>
                                    </dd>
                                  </div>
                                )}
                                {resultadoPessoa.empresaDetalhes?.linkedin_url && (
                                  <div className="flex gap-2">
                                    <dt className="text-pipe-muted w-28 shrink-0">LinkedIn</dt>
                                    <dd>
                                      <a href={resultadoPessoa.empresaDetalhes.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        Página da empresa
                                      </a>
                                    </dd>
                                  </div>
                                )}
                              </dl>
                            </section>

                            {!!(resultadoPessoa.empresaDetalhes?.telefone_empresa || resultadoPessoa.empresaDetalhes?.emails_genericos?.length) && (
                              <section className="border-t border-pipe-border pt-4">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                                  📞 Contato da empresa (grátis)
                                </p>
                                <div className="space-y-1.5 text-sm">
                                  {resultadoPessoa.empresaDetalhes?.telefone_empresa && (
                                    <div className="flex items-center gap-2">
                                      <a href={`tel:${resultadoPessoa.empresaDetalhes.telefone_empresa}`} className="text-pipe-lime font-semibold hover:underline">
                                        📞 {resultadoPessoa.empresaDetalhes.telefone_empresa}
                                      </a>
                                      <button
                                        onClick={async () => { await navigator.clipboard.writeText(resultadoPessoa.empresaDetalhes!.telefone_empresa!); }}
                                        className="text-xs text-pipe-muted hover:text-white transition"
                                      >
                                        📋
                                      </button>
                                    </div>
                                  )}
                                  {resultadoPessoa.empresaDetalhes?.emails_genericos?.map((email) => (
                                    <div key={email} className="flex items-center gap-2">
                                      <a href={`mailto:${email}`} className="text-pipe-lime hover:underline break-all">
                                        ✉️ {email}
                                      </a>
                                      <button
                                        onClick={async () => { await navigator.clipboard.writeText(email); }}
                                        className="text-xs text-pipe-muted hover:text-white transition shrink-0"
                                      >
                                        📋
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            )}

                            {(resultadoPessoa.telefones.length > 0 || resultadoPessoa.emails.length > 0) && (
                              <section className="border-t border-pipe-border pt-4">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                                  👤 Contato pessoal
                                </p>
                                <div className="space-y-1.5 text-sm">
                                  {resultadoPessoa.telefones.map((tel) => (
                                    <div key={tel} className="flex items-center gap-2">
                                      <a href={`tel:${tel}`} className="text-pipe-lime font-semibold hover:underline">
                                        📞 {tel}
                                      </a>
                                      <span className="text-[10px] text-pipe-muted">
                                        {resultadoPessoa.fontesTelefone.includes("millionphones") ? "MillionPhones" : "Web"}
                                      </span>
                                      <button
                                        onClick={async () => { await navigator.clipboard.writeText(tel); }}
                                        className="text-xs text-pipe-muted hover:text-white transition"
                                      >
                                        📋
                                      </button>
                                    </div>
                                  ))}
                                  {resultadoPessoa.emails.map((email) => (
                                    <div key={email} className="flex items-center gap-2">
                                      <a href={`mailto:${email}`} className="text-pipe-lime hover:underline break-all">
                                        ✉️ {email}
                                      </a>
                                      <button
                                        onClick={async () => { await navigator.clipboard.writeText(email); }}
                                        className="text-xs text-pipe-muted hover:text-white transition shrink-0"
                                      >
                                        📋
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {resultadoPessoa.emails.length > 0 && (
                                  <p className="text-[10px] text-pipe-muted mt-1 italic">⚠️ E-mails sugeridos — confira antes de usar</p>
                                )}
                              </section>
                            )}

                            {!resultadoPessoa.telefones.length && !resultadoPessoa.emails.length && !resultadoPessoa.empresaDetalhes?.telefone_empresa && !resultadoPessoa.empresaDetalhes?.emails_genericos?.length && (
                              <p className="text-xs text-amber-400 border-t border-pipe-border pt-4">
                                Nenhum telefone ou e-mail encontrado. Tente informar o LinkedIn para melhorar a busca.
                              </p>
                            )}

                            <section className="border-t border-pipe-border pt-4">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">✍️ Gerar abordagem por e-mail</p>
                              <select value={objetivoContato} onChange={(e) => setObjetivoContato(e.target.value)} className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white">
                                <option value="">Escolha a finalidade...</option>
                                <option value="gerar_interesse">Gerar interesse</option>
                                <option value="agendar_reuniao">Agendar reunião</option>
                                <option value="descobrir_responsavel">Descobrir o responsável</option>
                                <option value="fazer_diagnostico">Fazer diagnóstico</option>
                                <option value="apresentar_solucao">Apresentar solução</option>
                                <option value="follow_up">Fazer follow-up</option>
                                <option value="reativar_contato">Reativar contato</option>
                              </select>
                              <textarea value={orientacoesContato} onChange={(e) => setOrientacoesContato(e.target.value)} placeholder="Orientações para a IA (opcional): tom, oferta, contexto..." className="w-full min-h-20 mt-2 bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white" />
                              <button onClick={() => void gerarAbordagemContato()} disabled={!objetivoContato || gerandoAbordagem || !resultadoPessoa.id} className="mt-2 bg-pipe-lime text-pipe-dark px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40">{gerandoAbordagem ? "Gerando..." : "Gerar abordagem (1 crédito)"}</button>
                              {erroAbordagem && <p className="mt-2 text-xs text-red-400">{erroAbordagem}</p>}
                              {abordagemContato && <div className="mt-3 rounded-lg bg-pipe-dark border border-pipe-border p-3 space-y-2"><p className="text-sm font-semibold text-white">{abordagemContato.assunto}</p><p className="text-sm text-gray-300 whitespace-pre-wrap">{abordagemContato.conteudo}</p><button onClick={() => void copiarAbordagem()} className="text-xs text-pipe-lime hover:underline">{copiadoAbordagem ? "Copiado" : "Copiar e-mail"}</button></div>}
                            </section>
                          </div>
                        </aside>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {historico.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-2xl text-white mb-4">
                Buscas recentes
              </h2>

              <div className="space-y-2">
                {historico.map((contato) => (
                  <div
                    key={contato.id ?? contato.email}
                    className="bg-pipe-card border border-pipe-border rounded-xl px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {contato.nome ?? "—"}
                      </p>
                      <p className="text-xs text-pipe-muted truncate">
                        {[contato.cargo, contato.empresa]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-pipe-lime break-all max-w-[220px] truncate">
                        {contato.email}
                      </span>

                      {contato.company_id ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-pipe-lime/40 text-pipe-lime"
                          title="Este contato já está salvo em um dos seus leads"
                        >
                          ✅ Vinculado
                        </span>
                      ) : (
                        contato.id && (
                          <AtribuirLead
                            contatoId={contato.id}
                            empresas={empresas}
                            aoVincular={() => void carregarHistorico()}
                          />
                        )
                      )}

                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(contato.email)
                        }
                        title="Copiar e-mail"
                        className="shrink-0 border border-pipe-border text-gray-300 text-xs px-2.5 py-1.5 rounded-lg hover:bg-pipe-dark transition"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!carregando && historico.length === 0 && !resultado && (
            <p className="text-center text-pipe-muted mt-16">
              Suas buscas de contatos vão aparecer aqui. 🔎
            </p>
          )}
        </div>
      </main>

      {mostrarPopupMillionPhones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-pipe-card border border-pipe-border rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="text-center">
              <span className="text-4xl">🔒</span>
              <h3 className="font-display text-xl text-white mt-4">Serviço temporariamente indisponível</h3>
              <p className="text-sm text-pipe-muted mt-3">
                A busca de telefone pessoal via MillionPhones ainda não está ativada nesta conta.
              </p>
              <p className="text-sm text-pipe-muted mt-2">
                <strong className="text-gray-200">Contate o administrador</strong> para ativação deste serviço.
              </p>
              <button
                onClick={() => setMostrarPopupMillionPhones(false)}
                className="mt-6 bg-pipe-lime text-black font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition text-sm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PaginaBuscador() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-gray-400">Carregando...</p>
        </main>
      }
    >
      <BuscadorContent />
    </Suspense>
  );
}
