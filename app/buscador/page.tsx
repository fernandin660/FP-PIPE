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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        .eq("usuario_id", usuarioId)
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

      const { data: dadosEmpresas } = await supabase
        .from("companies")
        .select("id, nome_fantasia, razao_social")
        .order("criado_em", { ascending: false })
        .limit(300);

      setEmpresas((dadosEmpresas as EmpresaResumida[]) ?? []);

      const { data: dadosLeads } = await supabase
        .from("contatos")
        .select("id, linkedin_url, nome, cargo, empresa, email")
        .eq("usuario_id", user.id)
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

  const temInput = Boolean(urlLinkedin.trim() || empresaInput.trim() || nomeInput.trim());

  const buscar = async () => {
    const urlFinal = urlLinkedin.trim() || pendenteAutoBusca.current || "";
    pendenteAutoBusca.current = null;

    if (buscando || !urlFinal) return;

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
        setResultado(dados.contato);
        setSaldoContatos(dados.saldoContatos ?? null);
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

  const gerarAbordagemContato = async () => {
    if (
      !resultado?.id ||
      gerandoAbordagem ||
      !objetivoContato ||
      !canalContato
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
          canal: canalContato,
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
                🔎 Créditos de contato:{" "}
                <span className="text-pipe-lime font-bold">{saldoContatos}</span>
              </p>
            )}
          </div>

          <p className="text-pipe-muted mt-3 max-w-2xl">
            Selecione um lead da sua lista ou cole o link do LinkedIn. Receba{" "}
            <strong className="text-gray-200">e-mails sugeridos</strong> (grátis) +{" "}
            <strong className="text-gray-200">telefone verificado</strong> (3 créditos).
          </p>

          <div className="mt-8 bg-pipe-card border border-pipe-border rounded-xl p-6 space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-pipe-muted uppercase tracking-wide mb-2">
                Buscar lead
              </label>
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => aoDigitarBusca(e.target.value)}
                onFocus={() => termoBusca.length >= 2 && setMostrarResultados(true)}
                placeholder="Digite o nome da empresa ou pessoa..."
                className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                disabled={buscando}
              />

              {mostrarResultados && termoBusca.length >= 2 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-pipe-card border border-pipe-border rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                  {buscandoLead ? (
                    <p className="text-xs text-pipe-muted px-4 py-3">Buscando...</p>
                  ) : resultadosBusca.length > 0 ? (
                    resultadosBusca.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => selecionarLead(r.id ?? "")}
                        className="w-full text-left px-4 py-3 hover:bg-pipe-dark transition border-b border-pipe-border last:border-0"
                      >
                        <p className="text-sm font-semibold text-white">
                          {r.nome || r.empresa || "Sem nome"}
                        </p>
                        <p className="text-xs text-pipe-muted">
                          {r.nome && r.empresa ? `${r.empresa}` : ""}
                          {r.cargo ? ` · ${r.cargo}` : ""}
                          {r.origem === "contato" ? " · 📋 Salvo" : " · 🏢 Lista"}
                        </p>
                      </button>
                    ))
                  ) : leadNaoEncontrado ? (
                    <div className="px-4 py-3">
                      <p className="text-xs text-amber-400">
                        Lead não está nas suas listas.
                      </p>
                      <p className="text-xs text-pipe-muted mt-1">
                        Preencha os campos abaixo para buscar no banco de dados.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-pipe-muted uppercase tracking-wide mb-2">
                URL do perfil do LinkedIn
              </label>
              <input
                type="url"
                value={urlLinkedin}
                onChange={(e) => setUrlLinkedin(e.target.value)}
                placeholder="https://www.linkedin.com/in/nome-da-pessoa"
                className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                disabled={buscando}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-pipe-muted uppercase tracking-wide mb-2">
                  Nome da pessoa
                </label>
                <input
                  type="text"
                  value={nomeInput}
                  onChange={(e) => setNomeInput(e.target.value)}
                  placeholder="João Silva"
                  className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                  disabled={buscando}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pipe-muted uppercase tracking-wide mb-2">
                  Empresa
                </label>
                <input
                  type="text"
                  value={empresaInput}
                  onChange={(e) => setEmpresaInput(e.target.value)}
                  placeholder="Tech Solutions Ltda"
                  className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                  disabled={buscando}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-pipe-muted">Tipo de busca:</span>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={tipoBusca === "email"}
                      onChange={() => setTipoBusca("email")}
                      className="accent-pipe-lime"
                    />
                    <span className="text-xs text-gray-300">
                      📧 E-mail <span className="text-pipe-lime">(grátis)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={tipoBusca === "telefone"}
                      onChange={() => setTipoBusca("telefone")}
                      className="accent-pipe-lime"
                    />
                    <span className="text-xs text-gray-300">
                      📞 Telefone <span className="text-pipe-muted">(3 créditos)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={tipoBusca === "both"}
                      onChange={() => setTipoBusca("both")}
                      className="accent-pipe-lime"
                    />
                    <span className="text-xs text-gray-300">
                      📧📞 Ambos <span className="text-pipe-muted">(3 créditos)</span>
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={buscar}
                disabled={buscando || !temInput}
                className="bg-pipe-lime text-black font-semibold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm whitespace-nowrap"
              >
                {buscando ? "🔍 Buscando..." : "🔎 Buscar contato"}
              </button>
            </div>

            {mensagem && (
              <p
                className={`mt-4 text-sm ${
                  erroMensagem ? "text-red-400" : "text-amber-400"
                }`}
              >
                {mensagem}
              </p>
            )}

            {resultado && (
              <div className="mt-6 border border-pipe-blue/40 bg-pipe-blue/5 rounded-xl p-5">
                {veioDoCache && (
                  <p className="mb-3 text-[11px] font-bold text-pipe-lime bg-pipe-lime/10 border border-pipe-lime/30 rounded-lg px-3 py-1.5 inline-block">
                    ⚡ Resposta instantânea
                  </p>
                )}

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xl font-bold text-white">
                      {resultado.nome ?? "Contato encontrado"}
                    </p>
                    <p className="text-sm text-pipe-muted mt-0.5">
                      {[resultado.cargo, resultado.empresa]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                </div>

                {emailsEncontrados.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                      📧 E-mails sugeridos
                    </p>
                    <div className="space-y-1">
                      {emailsEncontrados.map((email: string, i: number) => (
                        <div
                          key={email}
                          className="flex items-center gap-2"
                        >
                          <a
                            href={`mailto:${email}`}
                            className="text-pipe-lime font-semibold break-all hover:underline text-sm"
                          >
                            {i + 1}. {email}
                          </a>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(email);
                            }}
                            className="text-xs text-pipe-muted hover:text-white transition"
                            title="Copiar"
                          >
                            📋
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-pipe-muted mt-1 italic">
                      ⚠️ Sugeridos — confira antes de usar
                    </p>
                  </div>
                )}

                {telefonesEncontrados.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted mb-2">
                      📞 Telefone verificado
                    </p>
                    <div className="space-y-1">
                      {telefonesEncontrados.map((tel: string) => (
                        <div
                          key={tel}
                          className="flex items-center gap-2"
                        >
                          <a
                            href={`tel:${tel}`}
                            className="text-pipe-lime font-semibold hover:underline text-sm"
                          >
                            {tel}
                          </a>
                          <span className="text-[10px] text-pipe-muted">✅ MillionPhones</span>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(tel);
                            }}
                            className="text-xs text-pipe-muted hover:text-white transition"
                            title="Copiar"
                          >
                            📋
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!emailsEncontrados.length && !telefonesEncontrados.length && resultado.email && (
                  <div className="mt-4">
                    <a
                      href={`mailto:${resultado.email}`}
                      className="text-pipe-lime font-semibold break-all hover:underline"
                    >
                      ✉️ {resultado.email}
                    </a>
                  </div>
                )}

                {(resultado.company_id || resultado.id) && (
                  <div className="mt-3 flex justify-end gap-2 flex-wrap items-center">
                    {resultado.company_id ? (
                      <span
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-pipe-lime/40 text-pipe-lime"
                        title="Este contato já está salvo em um dos seus leads"
                      >
                        ✅ Já vinculado a um lead
                      </span>
                    ) : (
                      <>
                        <CadastrarComoLead contato={resultado} />

                        <AtribuirLead
                          contatoId={resultado.id ?? ""}
                          empresas={empresas}
                          aoVincular={() => void carregarHistorico()}
                        />
                      </>
                    )}
                  </div>
                )}

                {resultado.id && (
                  <div className="mt-5 border-t border-pipe-border pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-blue mb-3">
                      🤖 Gerar abordagem para este contato
                    </p>

                    <p className="text-[11px] text-pipe-muted mb-3">
                      Usaremos o perfil do LinkedIn encontrado + o que sua
                      empresa vende (todo o portfólio). Custo: 1 Crédito de IA.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={objetivoContato}
                        onChange={(e) => setObjetivoContato(e.target.value)}
                        className="bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pipe-blue"
                      >
                        <option value="">Objetivo da abordagem...</option>
                        <option value="agendar_reuniao">📅 Agendar reunião</option>
                        <option value="gerar_interesse">✨ Gerar interesse</option>
                        <option value="fazer_diagnostico">🩺 Fazer diagnóstico</option>
                        <option value="apresentar_solucao">💡 Apresentar solução</option>
                        <option value="descobrir_responsavel">🔎 Descobrir o responsável</option>
                        <option value="outro">✏️ Outro</option>
                      </select>

                      <select
                        value={canalContato}
                        onChange={(e) => setCanalContato(e.target.value)}
                        className="bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pipe-blue"
                      >
                        <option value="">Canal...</option>
                        <option value="email">✉️ E-mail</option>
                        <option value="linkedin">💼 LinkedIn</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="ligacao">📞 Ligação</option>
                      </select>
                    </div>

                    <button
                      onClick={gerarAbordagemContato}
                      disabled={
                        gerandoAbordagem || !objetivoContato || !canalContato
                      }
                      className="mt-3 w-full bg-pipe-blue/15 border border-pipe-blue text-pipe-blue text-xs font-bold py-2.5 rounded-lg hover:bg-pipe-blue/25 disabled:opacity-50 transition"
                    >
                      {gerandoAbordagem
                        ? "🤖 Nossa equipe está escrevendo..."
                        : "🤖 Gerar abordagem"}
                    </button>

                    {erroAbordagem && (
                      <p className="mt-3 text-sm text-red-400">{erroAbordagem}</p>
                    )}

                    {abordagemContato && (
                      <div className="mt-4 space-y-2">
                        {abordagemContato.argumento && (
                          <p className="text-xs text-pipe-lime border-l-2 border-pipe-lime/40 pl-3">
                            💡 {abordagemContato.argumento}
                          </p>
                        )}

                        {abordagemContato.canal === "email" &&
                          abordagemContato.assunto && (
                            <p className="text-sm text-gray-200">
                              <strong>Assunto:</strong> {abordagemContato.assunto}
                            </p>
                          )}

                        <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed bg-pipe-dark border border-pipe-border rounded-xl p-4">
{abordagemContato.conteudo}
                        </pre>

                        <button
                          onClick={copiarAbordagem}
                          className="text-xs font-semibold bg-pipe-lime text-black px-4 py-2 rounded-lg hover:opacity-90 transition"
                        >
                          {copiadoAbordagem ? "✅ Copiado!" : "📋 Copiar abordagem"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

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
