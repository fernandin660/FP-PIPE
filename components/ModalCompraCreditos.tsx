"use client";

import Link from "next/link";
import { IconeCartao } from "./Icones";

export default function ModalCompraCreditos({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg bg-pipe-card border border-pipe-border rounded-xl p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onFechar}
          className="absolute top-4 right-4 text-pipe-muted hover:text-white text-xl transition"
          aria-label="Fechar"
        >
          ×
        </button>

        <span className="w-12 h-12 rounded-xl bg-pipe-lime/10 border border-pipe-lime/30 flex items-center justify-center text-pipe-lime">
          <IconeCartao className="w-6 h-6" />
        </span>

        <h2 className="font-display text-2xl text-white mt-4">
          Você atingiu o limite de créditos do seu plano.
        </h2>

        <p className="text-pipe-muted text-sm mt-2 leading-relaxed">
          Cada empresa completa usa 1 crédito. Para continuar gerando no mesmo
          mês, o caminho é um plano com mais créditos mensais.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            href="/planos"
            onClick={onFechar}
            className="flex-1 text-center rounded-xl bg-pipe-lime text-black font-bold py-3 text-sm hover:brightness-110 transition"
          >
            Ver planos e fazer upgrade
          </Link>
          <button
            onClick={onFechar}
            className="rounded-xl border border-pipe-border text-pipe-muted hover:text-white hover:border-pipe-blue px-5 py-3 text-sm font-semibold transition"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}