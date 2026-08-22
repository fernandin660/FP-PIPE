"use client";

import { useState } from "react";

const PACOTES = [
  {
    creditos: 50,
    preco: "R$ 97",
    porLead: "R$ 1,94 por lead",
    destaque: false,
  },
  {
    creditos: 150,
    preco: "R$ 247",
    porLead: "R$ 1,65 por lead",
    destaque: true,
  },
  {
    creditos: 400,
    preco: "R$ 497",
    porLead: "R$ 1,24 por lead",
    destaque: false,
  },
];

export default function ModalCompraCreditos({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const [aviso, setAviso] = useState("");

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
          ✕
        </button>

        <h2 className="font-display text-3xl text-white">
          Ficou sem{" "}
          <span className="text-pipe-lime">créditos</span>
        </h2>

        <p className="text-pipe-muted text-sm mt-2">
          Cada crédito desbloqueia 1 lead completo: empresa, decisor certo e
          contatos diretos.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mt-6">
          {PACOTES.map((pacote) => (
            <div
              key={pacote.creditos}
              className={`rounded-lg p-4 flex flex-col items-center text-center ${
                pacote.destaque
                  ? "bg-pipe-lime/10 border-2 border-pipe-lime"
                  : "bg-pipe-dark border border-pipe-border"
              }`}
            >
              {pacote.destaque && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-pipe-lime text-black px-2 py-0.5 rounded-full mb-2">
                  Mais popular
                </span>
              )}

              <p className="font-display text-3xl text-white">
                {pacote.creditos}
              </p>
              <p className="text-pipe-muted text-xs">créditos</p>

              <p className="text-white font-bold mt-3">{pacote.preco}</p>
              <p className="text-pipe-muted/70 text-[11px] mt-1">
                {pacote.porLead}
              </p>

              <button
                onClick={() =>
                  setAviso(
                    "Checkout seguro chegando! Por enquanto, fale com o Fernando para recarregar."
                  )
                }
                className={`mt-4 w-full py-2 rounded-lg text-sm font-semibold transition ${
                  pacote.destaque
                    ? "bg-pipe-lime text-black hover:opacity-90"
                    : "bg-pipe-blue/15 text-pipe-blue border border-pipe-blue/30 hover:bg-pipe-blue/25"
                }`}
              >
                Comprar
              </button>
            </div>
          ))}
        </div>

        {aviso && (
          <p className="mt-5 text-center text-sm text-pipe-lime">{aviso}</p>
        )}
      </div>
    </div>
  );
}
