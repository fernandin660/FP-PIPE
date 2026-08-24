"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ApiUso = {
  api: string;
  chamadas: number;
  limite: number | null;
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
};

export default function PaginaAdminUso() {
  const [carregando, setCarregando] = useState(true);
  const [restrito, setRestrito] = useState(false);
  const [mes, setMes] = useState("");
  const [apis, setApis] = useState<ApiUso[]>([]);
  const [moedas, setMoedas] = useState<Moeda[]>([]);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  if (restrito) {
    return (
      <main className="min-h-screen bg-pipe-bg text-gray-200 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-display text-2xl text-white mb-3">
            Área do dono 🔒
          </p>
          <p className="text-pipe-muted text-sm mb-6">
            Faça login com a conta de administrador para ver os números.
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold bg-pipe-lime text-black rounded-lg px-5 py-2.5"
          >
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/prospeccao"
          className="text-xs text-pipe-muted hover:text-white transition"
        >
          ← voltar
        </Link>

        <h1 className="font-display text-3xl text-white mt-3">
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
            <h2 className="text-sm font-bold uppercase tracking-wide text-pipe-muted mb-4">
              APIs pagas este mês
            </h2>

            <div className="space-y-3">
              {apis.map((a) => {
                const percentual =
                  a.limite && a.limite > 0
                    ? Math.min(100, Math.round((a.chamadas / a.limite) * 100))
                    : 0;

                return (
                  <div
                    key={a.api}
                    className="bg-pipe-card border border-pipe-border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm font-semibold text-white">
                        {NOMES_APIS[a.api] ?? a.api}
                      </p>
                      <p className="text-sm text-gray-300">
                        <span className="font-bold">{a.chamadas}</span>
                        {a.limite ? ` / ${a.limite} chamadas` : " chamadas"}
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
                    </div>

                    {a.limite ? (
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
