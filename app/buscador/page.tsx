"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { criarClienteSupabase } from "../../lib/supabase/client";
import Sidebar from "../../components/Sidebar";
import ModalPerfil, {
  type PerfilVendedor,
} from "../../components/ModalPerfil";

type ContatoEncontrado = {
  id?: string;
  linkedin_url?: string | null;
  nome: string | null;
  cargo: string | null;
  empresa: string | null;
  email: string;
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
}: {
  contatoId: string;
  empresas: EmpresaResumida[];
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
        {concluido ? `📎 ${concluido}` : "📎 Atribuir"}
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

export default function PaginaBuscador() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [saldoContatos, setSaldoContatos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  const [urlLinkedin, setUrlLinkedin] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erroMensagem, setErroMensagem] = useState(false);
  const [resultado, setResultado] = useState<ContatoEncontrado | null>(null);
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

  const carregarHistorico = useCallback(
    async (idUsuario: string) => {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      const { data: contatos } = await supabase
        .from("contatos")
        .select("id, linkedin_url, nome, cargo, empresa, email")
        .eq("usuario_id", idUsuario)
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
          "nome_empresa, area_atuacao, produtos_servicos, site, foto_url, anexos, nichos"
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

      await carregarHistorico(user.id);

      setCarregando(false);
    }

    carregar();
  }, [router, carregarHistorico]);

  const buscar = async () => {
    if (buscando || !urlLinkedin.trim()) return;

    setBuscando(true);
    setMensagem("");
    setErroMensagem(false);
    setResultado(null);
    setCopiado(false);
    setAbordagemContato(null);
    setErroAbordagem("");

    try {
      const resposta = await fetch("/api/buscar-contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrl: urlLinkedin.trim() }),
      });

      const dados = (await resposta.json()) as {
        encontrado?: boolean;
        contato?: ContatoEncontrado;
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
            <Link href="/" className="font-display text-3xl text-white">
              FP <span className="text-pipe-lime">Pipe</span>
            </Link>

            <Link
              href="/"
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
            Cole o link de um perfil do LinkedIn e receba o{" "}
            <strong className="text-gray-200">e-mail verificado</strong> da
            pessoa. Cada busca bem-sucedida consome 1 crédito — busca sem
            resultado não cobra nada.
          </p>

          <div className="mt-8 bg-pipe-card border border-pipe-border rounded-xl p-6">
            <label className="block text-xs font-semibold text-pipe-muted uppercase tracking-wide mb-2">
              URL do perfil do LinkedIn
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={urlLinkedin}
                onChange={(e) => setUrlLinkedin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") buscar();
                }}
                placeholder="https://www.linkedin.com/in/nome-da-pessoa"
                className="flex-1 bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-pipe-blue"
                disabled={buscando}
              />

              <button
                onClick={buscar}
                disabled={buscando || !urlLinkedin.trim()}
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

                  <button
                    onClick={copiarEmail}
                    className="border border-pipe-border text-gray-300 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-pipe-dark transition"
                  >
                    {copiado ? "✅ Copiado!" : "📋 Copiar e-mail"}
                  </button>
                </div>

                <a
                  href={`mailto:${resultado.email}`}
                  className="mt-4 inline-block text-pipe-lime font-semibold break-all hover:underline"
                >
                  ✉️ {resultado.email}
                </a>

                {resultado.id && (
                  <div className="mt-3 flex justify-end">
                    <AtribuirLead
                      contatoId={resultado.id}
                      empresas={empresas}
                    />
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

                      {contato.id && (
                        <AtribuirLead
                          contatoId={contato.id}
                          empresas={empresas}
                        />
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
