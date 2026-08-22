"use client";

import { useState } from "react";

export type LeadManual = {
  razaoSocial: string;
  cnpj: string;
  linkedin: string;
  telefone: string;
  email: string;
};

export default function ModalLeadManual({
  aberto,
  onFechar,
  onSalvar,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (lead: LeadManual) => void;
}) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  if (!aberto) return null;

  function limparFormulario() {
    setRazaoSocial("");
    setCnpj("");
    setLinkedin("");
    setTelefone("");
    setEmail("");
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();

    if (!razaoSocial.trim()) return;

    onSalvar({
      razaoSocial: razaoSocial.trim(),
      cnpj: cnpj.replace(/\D/g, ""),
      linkedin: linkedin.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
    });

    limparFormulario();
  }

  const classesInput =
    "w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white text-sm";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md bg-pipe-card border border-pipe-border rounded-xl p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto"
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
          Inserir <span className="text-pipe-lime">lead manualmente</span>
        </h2>

        <p className="text-pipe-muted text-sm mt-2">
          Já tem um lead enriquecido (ex.: pelo Apollo)? Cole os dados aqui.
          Ele entra na lista pronto — gaste 1 crédito para visualizar os
          contatos.
        </p>

        <form onSubmit={submeter} className="space-y-3 mt-6">
          <div>
            <label className="text-xs text-pipe-muted">
              Nome da empresa *
            </label>
            <input
              required
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Ex.: Sertran Transportes LTDA"
              className={`${classesInput} mt-1`}
            />
          </div>

          <div>
            <label className="text-xs text-pipe-muted">
              CNPJ (opcional)
            </label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className={`${classesInput} mt-1`}
            />
          </div>

          <div>
            <label className="text-xs text-pipe-muted">
              Link do LinkedIn (opcional)
            </label>
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://www.linkedin.com/company/..."
              className={`${classesInput} mt-1`}
            />
          </div>

          <div>
            <label className="text-xs text-pipe-muted">
              Telefone (opcional)
            </label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(16) 99999-0000"
              className={`${classesInput} mt-1`}
            />
          </div>

          <div>
            <label className="text-xs text-pipe-muted">
              E-mail (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@empresa.com.br"
              className={`${classesInput} mt-1`}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-pipe-lime text-black font-bold py-3 rounded-lg hover:opacity-90 transition mt-2"
          >
            Adicionar à lista →
          </button>
        </form>
      </div>
    </div>
  );
}
