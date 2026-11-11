"use client";

import { useEffect, type ReactNode } from "react";
import type { CampoPersonalizado } from "../../lib/crm-campos";

export const classeCampo =
  "w-full rounded-lg border border-pipe-border bg-white px-3 py-2.5 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:border-pipe-blue focus:outline-none";

export function BotaoPrimario({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-pipe-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-40 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-pipe-border bg-white px-4 py-2.5 text-sm text-pipe-ink transition hover:border-pipe-ink/30 disabled:opacity-40 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Rotulo({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-pipe-ink-soft">
      {children}
    </label>
  );
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "ok"; children: ReactNode }) {
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`border-l-2 pl-3 text-sm ${tipo === "erro" ? "border-red-600 text-red-700" : "border-pipe-blue text-[#1a33bd]"}`}
    >
      {children}
    </p>
  );
}

/** Janela central com fundo escurecido; Esc e clique fora fecham. */
export function Janela({
  aberta,
  titulo,
  aoFechar,
  children,
  largura = "max-w-lg",
}: {
  aberta: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta, aoFechar]);
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#111114]/30 p-4 sm:items-center" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`my-8 w-full ${largura} rounded-2xl border border-pipe-border bg-pipe-card p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-medium tracking-[-0.02em] text-pipe-ink">{titulo}</h2>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="h-8 w-8 shrink-0 rounded-full border border-pipe-border text-pipe-muted hover:text-pipe-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const moedaBr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const formatarMoeda = (v: number) => moedaBr.format(v);

/** Valor de um campo personalizado pronto para exibir. */
export function valorExibido(campo: CampoPersonalizado, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (campo.tipo === "moeda" && typeof valor === "number") return formatarMoeda(valor);
  if (campo.tipo === "data" && typeof valor === "string") {
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }
  return String(valor);
}

/** Entrada de um campo personalizado conforme o tipo. */
export function EntradaCampo({
  campo,
  valor,
  aoMudar,
  id,
}: {
  campo: CampoPersonalizado;
  valor: unknown;
  aoMudar: (v: unknown) => void;
  id?: string;
}) {
  const v = valor === null || valor === undefined ? "" : String(valor);
  if (campo.tipo === "texto_longo") {
    return <textarea id={id} rows={3} value={v} onChange={(e) => aoMudar(e.target.value)} className={classeCampo} />;
  }
  if (campo.tipo === "opcao") {
    return (
      <select id={id} value={v} onChange={(e) => aoMudar(e.target.value || null)} className={classeCampo}>
        <option value="">—</option>
        {campo.opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  const tipoHtml =
    campo.tipo === "numero" || campo.tipo === "moeda"
      ? "number"
      : campo.tipo === "data"
        ? "date"
        : campo.tipo === "email"
          ? "email"
          : campo.tipo === "url"
            ? "url"
            : campo.tipo === "telefone"
              ? "tel"
              : "text";
  return (
    <input
      id={id}
      type={tipoHtml}
      value={v}
      step={campo.tipo === "moeda" ? "0.01" : undefined}
      placeholder={campo.tipo === "url" ? "https://" : undefined}
      onChange={(e) =>
        aoMudar(
          tipoHtml === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value
        )
      }
      className={classeCampo}
    />
  );
}

/**
 * Bloco de campos personalizados: mostra os valores e, em modo edição,
 * os campos de entrada. Salva tudo de uma vez.
 */
export function BlocoCampos({
  campos,
  valores,
  editando,
  rascunho,
  aoMudarRascunho,
}: {
  campos: CampoPersonalizado[];
  valores: Record<string, unknown>;
  editando: boolean;
  rascunho: Record<string, unknown>;
  aoMudarRascunho: (r: Record<string, unknown>) => void;
}) {
  if (campos.length === 0) return null;
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {campos.map((c) => (
        <div key={c.id} className={c.tipo === "texto_longo" ? "sm:col-span-2" : ""}>
          <dt className="mb-1 text-xs text-pipe-muted">
            {editando ? <label htmlFor={`campo-${c.id}`}>{c.nome}</label> : c.nome}
          </dt>
          <dd className="text-sm text-pipe-ink">
            {editando ? (
              <EntradaCampo
                id={`campo-${c.id}`}
                campo={c}
                valor={rascunho[c.id]}
                aoMudar={(v) => aoMudarRascunho({ ...rascunho, [c.id]: v })}
              />
            ) : c.tipo === "url" && typeof valores[c.id] === "string" ? (
              <a href={String(valores[c.id])} target="_blank" rel="noopener noreferrer" className="text-pipe-blue underline-offset-4 hover:underline">
                {String(valores[c.id])}
              </a>
            ) : (
              valorExibido(c, valores[c.id])
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
