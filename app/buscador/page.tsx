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
