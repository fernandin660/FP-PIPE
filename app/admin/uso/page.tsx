"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ApiUso = {
  api: string;
  chamadas: number;
  limite: number | null;
  ajustado?: boolean;
};

type Moeda = {
  chave: string;
  nome: string;
  total: number;
  usuarios: { email: string; saldo: number }[];
};

const NOMES_APIS: Record<string, string> = {
  maps: "🗺️ Google Maps",
  anymail: "📧 Anymail Finder",
  openai: "🤖 OpenAI",
  gemini: "✨ Google Gemini (reserva)",
  serper: "🔎 Serper (busca Google)",
  casadosdados: "🏢 Casas dos Dados",
  minhareceita: "🏛️ Minha Receita (CNPJ)",
  nominatim: "🌍 OpenStreetMap — geocoding",
  overpass: "🗺️ Overpass — empresas OSM",
  resend: "✉️ Resend (e-mails)",
};

export default function PaginaAdminUso() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [restrito, setRestrito] = useState(false);
  const [mes, setMes] = useState("");
  const [apis, setApis] = useState<ApiUso[]>([]);
  const [moedas, setMoedas] = useState<Moeda[]>([]);
  const [editandoApi, setEditandoApi] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState("");
  const [salvandoLimite, setSalvandoLimite] = useState(false);

  const carregarUso = async () => {
    try {
      const resposta = await fetch("/api/admin-uso");

      if (resposta.status === 403) {
        setRestrito(true);
        return;
      }

      const dados = (await resposta.json()) as {
        mes?: string;
        apis?: ApiUso[];
        moedas?: Moeda[];
      };

      setMes(dados.mes ?? "");
      setApis(dados.apis ?? []);
      setMoedas(dados.moedas ?? []);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUso();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvarLimite = async (api: string) => {
    const limite = Number(valorEdicao);

    if (!Number.isInteger(limite) || limite < 1) {
      alert("Informe um número inteiro maior que zero.");
      return;
    }

    setSalvandoLimite(true);

    try {
      const resposta = await fetch("/api/admin-limites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api, limite }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro ?? "Erro ao salvar limite");
      }

      setEditandoApi(null);
      await carregarUso();
    } catch (erro) {
      alert(
        erro instanceof Error
          ? erro.message
          : "Erro ao salvar limite"
      );
    } finally {
      setSalvandoLimite(false);
    }
  };

  useEffect(() => {
    if (restrito) router.replace("/prospeccao");
  }, [restrito, router]);

  if (restrito) {
    return (
      <main className="min-h-screen bg-pipe-bg text-gray-200 flex items-center justify-center px-6">
        <p className="text-pipe-muted text-sm">Redirecionando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/prospeccao"
            className="inline-flex items-center gap-2 text-sm bg-pipe-card border border-pipe-border rounded-lg px-4 py-2 hover:border-pipe-blue/60 hover:text-white transition"
          >
            ← Voltar ao painel
          </Link>
          <Link
            href="/admin"
            className="text-xs text-pipe-muted hover:text-white transition"
          >
            Console de usuários →
          </Link>
        </div>

        <h1 className="font-display text-3xl text-white mt-6">
          Painel de uso 💰
        </h1>
        <p className="text-pipe-muted text-sm mt-1">
          Consumo das APIs pagas e saldos das moedas internas ·{" "}
          {mes ? `mês ${mes}` : "carregando..."}
        </p>

        {carregando && (
          <p className="text-pipe-muted text-sm mt-10">Carregando...</p>
        )}

        {/* APIS PAGAS */}
        {!carregando && apis.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-wide text-pipe-muted mb-1">
              APIs pagas este mês
            </h2>
            <p className="text-xs text-pipe-muted mb-4">
              Limites refletem nossas contas nos provedores. Clique no ✏️
              para ajustar quando trocarmos de plano.
            </p>

            <div className="space-y-3">
              {apis.map((a) => {
                const percentual =
                  a.limite && a.limite > 0
                    ? Math.min(100, Math.round((a.chamadas / a.limite) * 100))
                    : 0;
                const emEdicao = editandoApi === a.api;

                return (
                  <div
                    key={a.api}
                    className="bg-pipe-card border border-pipe-border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm font-semibold text-white">
                        {NOMES_APIS[a.api] ?? a.api}
                        {a.ajustado && (
                          <span
                            className="ml-2 text-[10px] font-bold uppercase tracking-wide text-pipe-blue"
                            title="Limite ajustado manualmente no console"
                          >
                            · ajustado
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-3">
                        {emEdicao ? (
                          <>
                            <input
                              type="number"
                              min={1}
                              value={valorEdicao}
                              onChange={(e) =>
                                setValorEdicao(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  salvarLimite(a.api);
                                if (e.key === "Escape")
                                  setEditandoApi(null);
                              }}
                              autoFocus
                              className="w-28 bg-pipe-dark border border-pipe-border rounded-lg px-3 py-1.5 text-sm focus:border-pipe-blue focus:outline-none text-white"
                            />
                            <button
                              onClick={() => salvarLimite(a.api)}
                              disabled={salvandoLimite}
                              className="text-xs font-bold bg-pipe-lime text-black rounded-md px-3 py-1.5 hover:opacity-90 disabled:opacity-50 transition"
                            >
                              ✓ Salvar
                            </button>
                            <button
                              onClick={() => setEditandoApi(null)}
                              className="text-xs text-pipe-muted hover:text-white transition"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-300">
                              <span className="font-bold">
                                {a.chamadas}
                              </span>
                              {a.limite
                                ? ` / ${a.limite.toLocaleString("pt-BR")} chamadas`
                                : " chamadas"}
                              {a.limite ? (
                                <span
                                  className={`ml-2 text-xs font-bold ${
                                    percentual >= 100
                                      ? "text-red-400"
                                      : percentual >= 75
                                        ? "text-yellow-400"
                                        : "text-pipe-lime"
                                  }`}
                                >
                                  {percentual}%
                                </span>
                              ) : null}
                            </p>
                            <button
                              onClick={() => {
                                setEditandoApi(a.api);
                                setValorEdicao(String(a.limite ?? ""));
                              }}
                              title="Ajustar limite (ex.: quando trocarmos o plano da conta)"
                              className="text-xs text-pipe-muted hover:text-white border border-pipe-border rounded-md px-2 py-1 transition"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {a.limite && !emEdicao ? (
                      <div className="mt-2 h-2 bg-pipe-dark rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentual >= 100
                              ? "bg-red-500"
                              : percentual >= 75
                                ? "bg-yellow-400"
                                : "bg-pipe-lime"
                          }`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!carregando && apis.length === 0 && (
          <p className="text-pipe-muted text-xs mt-8">
            Nenhuma chamada de API paga registrada ainda neste mês.
          </p>
        )}

        {/* MOEDAS INTERNAS */}
        {!carregando && moedas.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-bold uppercase tracking-wide text-pipe-muted mb-4">
              Moedas em circulação
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              {moedas.map((moeda) => (
                <div
                  key={moeda.chave}
                  className="bg-pipe-card border border-pipe-border rounded-xl p-5"
                >
                  <p className="text-xs font-semibold text-pipe-muted">
                    {moeda.nome}
                  </p>
                  <p className="font-display text-3xl text-white mt-2">
                    {moeda.total}
                  </p>
                  <p className="text-[11px] text-pipe-muted mt-1">
                    {moeda.usuarios.length} usuário(s) com saldo
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DETALHAMENTO POR USUARIO */}
        {!carregando &&
          moedas.map(
            (moeda) =>
              moeda.usuarios.length > 0 && (
                <section key={moeda.chave} className="mt-8">
                  <h3 className="text-sm font-bold text-white mb-3">
                    {moeda.nome} · por usuário
                  </h3>

                  <div className="bg-pipe-card border border-pipe-border rounded-xl divide-y divide-pipe-border/60">
                    {moeda.usuarios.map((u) => (
                      <div
                        key={`${moeda.chave}-${u.email}`}
                        className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="text-gray-300 truncate">
                          {u.email}
                        </span>
                        <span className="font-bold text-white shrink-0">
                          {u.saldo}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )
          )}
      </div>
    </main>
  );
}
