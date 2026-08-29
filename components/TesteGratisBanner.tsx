"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFINICAO_PLANOS } from "@/lib/planos";

interface Props {
  saldoListas: number;
  saldoLeads: number;
  saldoAbordagens: number;
}

function porc(restante: number, limite: number): number {
  if (limite <= 0) return 0;
  const usado = Math.max(0, Math.min(limite, limite - restante));
  return Math.round((usado / limite) * 100);
}

function barra(
  rotulo: string,
  emoji: string,
  restante: number,
  limite: number,
  corCheia: string
) {
  const pct = porc(restante, limite);
  const quase = restante <= Math.ceil(limite * 0.2) && restante > 0;
  const esgotou = restante <= 0;
  const alerta = esgotou || quase;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-300 font-medium">
          {emoji} {rotulo}
        </span>
        <span
          className={`font-semibold ${
            esgotou ? "text-red-400" : quase ? "text-amber-400" : "text-pipe-lime"
          }`}
        >
          {Math.max(0, restante)}/{limite}
        </span>
      </div>
      <div className="h-2 rounded-full bg-pipe-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            esgotou ? corCheia : quase ? "bg-amber-400" : corCheia
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {esgotou && (
        <p className="text-[10px] text-red-400 mt-0.5">
          Você usou tudo aqui. Assine para continuar →{" "}
        </p>
      )}
      {quase && !esgotou && (
        <p className="text-[10px] text-amber-400 mt-0.5">Quase no limite.</p>
      )}
    </div>
  );
}

export default function TesteGratisBanner({
  saldoListas,
  saldoLeads,
  saldoAbordagens,
}: Props) {
  const [fechado, setFechado] = useState(false);
  if (fechado) return null;

  const t = DEFINICAO_PLANOS.teste;
  const gold = DEFINICAO_PLANOS.gold;
  const silver = DEFINICAO_PLANOS.silver;
  const plat = DEFINICAO_PLANOS.platinum;

  const esgotouAlgo =
    saldoListas <= 0 || saldoLeads <= 0 || saldoAbordagens <= 0;

  const planos = [
    {
      nome: silver.nome,
      preco: "R$ 117",
      destaque: false,
      linha: `${silver.empresasMes} empresas/mês`,
    },
    {
      nome: gold.nome,
      preco: `R$ ${gold.precoAnualPorMes}`,
      destaque: true,
      linha: `${gold.empresasMes} empresas · disparo ${gold.buscasMes} e-mails/dia`,
    },
    {
      nome: plat.nome,
      preco: `R$ ${plat.precoAnualPorMes}`,
      destaque: false,
      linha: `${plat.empresasMes} empresas · 300 e-mails/dia`,
    },
  ];

  return (
    <div className="mb-8">
      <div
        className={`rounded-2xl border overflow-hidden ${
          esgotouAlgo
            ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-pipe-card to-pipe-card"
            : "border-pipe-border bg-pipe-card"
        }`}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  🧪 Seu teste grátis
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-pipe-blue/15 text-pipe-blue px-1.5 py-0.5 rounded">
                  plano atual
                </span>
              </div>
              <p className="text-xs text-pipe-muted mt-1">
                {t.listasMes} lista · {t.empresasMes} leads · {t.creditosAbordagem}{" "}
                abordagens de IA. Quando acabar, escolha um plano — sem perda do que
                você já criou.
              </p>
            </div>

            <button
              onClick={() => setFechado(true)}
              className="text-xs text-pipe-muted hover:text-white transition"
              title="Ocultar"
            >
              ✕
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mb-5">
            {barra("Listas", "📋", saldoListas, t.listasMes, "bg-pipe-blue")}
            {barra("Leads", "🎫", saldoLeads, t.empresasMes, "bg-pipe-blue")}
            {barra(
              "Abordagens IA",
              "✍️",
              saldoAbordagens,
              t.creditosAbordagem,
              "bg-pipe-blue"
            )}
          </div>

          {esgotouAlgo && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-5 bg-pipe-dark/60 border border-amber-500/30 rounded-xl p-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-white">
                  Cê chegou no limite do teste. Bora destravar o resto? 🚀
                </p>
                <p className="text-xs text-pipe-muted mt-0.5">
                  No Gold você continua de onde parou: mais listas, leads,
                  buscador, telefones e disparo de campanhas.
                </p>
              </div>
              <Link
                href="/planos"
                className="shrink-0 bg-pipe-lime text-pipe-bg font-bold py-2.5 px-5 rounded-xl text-sm text-center hover:brightness-110 transition animate-pulse"
              >
                ⭐ Assinar Gold → R$ {gold.precoAnualPorMes}/mês
              </Link>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-pipe-muted">
                Planos para continuar
              </p>
              <Link
                href="/planos"
                className="text-xs text-pipe-blue hover:text-blue-300 transition font-semibold"
              >
                Ver todos →
              </Link>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {planos.map((p) => (
                <Link
                  key={p.nome}
                  href="/planos"
                  className={`rounded-xl border p-3 flex flex-col gap-1 transition hover:brightness-110 ${
                    p.destaque
                      ? "bg-pipe-lime/10 border-pipe-lime/50"
                      : "bg-pipe-dark border-pipe-border hover:border-pipe-blue/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold ${
                        p.destaque ? "text-pipe-lime" : "text-white"
                      }`}
                    >
                      {p.nome}
                    </span>
                    {p.destaque && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-pipe-lime text-pipe-bg px-1.5 py-0.5 rounded">
                        Mais vendido
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-display text-white">
                    {p.preco}
                    <span className="text-[10px] text-pipe-muted font-normal">
                      {" "}
                      /mês
                    </span>
                  </span>
                  <span className="text-[11px] text-pipe-muted">{p.linha}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
