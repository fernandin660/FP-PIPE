"use client";

import { useState } from "react";
import type { Dicionario, Idioma } from "./dicionario";

type Estado = "parado" | "enviando" | "ok" | "erro";

export default function FormularioContato({ dic, idioma }: { dic: Dicionario; idioma: Idioma }) {
  const [estado, setEstado] = useState<Estado>("parado");
  const c = dic.contato;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = Object.fromEntries(new FormData(form).entries());
    setEstado("enviando");
    try {
      const r = await fetch("/api/studio/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dados, idioma }),
      });
      setEstado(r.ok ? "ok" : "erro");
      if (r.ok) form.reset();
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "ok") {
    return (
      <div className="flex min-h-[320px] items-center border-t border-[#111114] pt-8" role="status">
        <p className="studio-titulo-secao max-w-[18ch]">{c.sucesso}</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-x-8 gap-y-7 md:grid-cols-2" noValidate={false}>
      <Campo id="nome" rotulo={c.campos.nome} obrigatorio autoComplete="name" />
      <Campo id="empresa" rotulo={c.campos.empresa} autoComplete="organization" opcional={c.campos.opcional} />
      <Campo id="email" rotulo={c.campos.email} tipo="email" obrigatorio autoComplete="email" />
      <Campo id="telefone" rotulo={c.campos.telefone} tipo="tel" autoComplete="tel" opcional={c.campos.opcional} />
      <div className="md:col-span-2">
        <label htmlFor="mensagem" className="studio-rotulo">
          {c.campos.mensagem}
        </label>
        <textarea id="mensagem" name="mensagem" required rows={4} maxLength={3000} className="studio-campo resize-none" />
      </div>
      {/* Armadilha para robôs: invisível para pessoas */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="site">Site</label>
        <input id="site" name="site" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col gap-4 md:col-span-2 md:flex-row md:items-center md:justify-between">
        <p className="max-w-[46ch] text-sm text-[#5e5e66]">{c.rgpd}</p>
        <button type="submit" className="studio-botao" disabled={estado === "enviando"}>
          {estado === "enviando" ? c.enviando : c.enviar} <span aria-hidden="true">→</span>
        </button>
      </div>
      {estado === "erro" && (
        <p className="text-sm text-[#b42318] md:col-span-2" role="alert">
          {c.erro}
        </p>
      )}
    </form>
  );
}

function Campo({
  id,
  rotulo,
  tipo = "text",
  obrigatorio = false,
  autoComplete,
  opcional,
}: {
  id: string;
  rotulo: string;
  tipo?: string;
  obrigatorio?: boolean;
  autoComplete?: string;
  opcional?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="studio-rotulo">
        {rotulo}
        {!obrigatorio && opcional && <span className="ml-2 normal-case tracking-normal text-[#8a8a92]">({opcional})</span>}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        required={obrigatorio}
        autoComplete={autoComplete}
        maxLength={200}
        className="studio-campo"
      />
    </div>
  );
}
