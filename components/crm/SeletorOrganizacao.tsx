"use client";

import { useEffect, useId, useState } from "react";
import { classeCampo } from "./ui";
import { useAtraso } from "./useCamposPersonalizados";

type Opcao = { id: string; nome: string; cidade?: string | null };

/** Campo de busca de organização (procura em todas as empresas da conta). */
export default function SeletorOrganizacao({
  valor,
  aoEscolher,
  aoCriarNova,
}: {
  valor: { id: string; nome: string } | null;
  aoEscolher: (o: { id: string; nome: string } | null) => void;
  aoCriarNova?: (nome: string) => void;
}) {
  const idLista = useId();
  const [texto, setTexto] = useState(valor?.nome ?? "");
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const termo = useAtraso(texto, 250);

  useEffect(() => {
    if (!aberto || termo.trim().length < 2) return;
    let vivo = true;
    fetch(`/api/crm/organizacoes?escopo=todas&busca=${encodeURIComponent(termo.trim())}`)
      .then((r) => (r.ok ? r.json() : { organizacoes: [] }))
      .then((d: { organizacoes?: Opcao[] }) => vivo && setOpcoes((d.organizacoes ?? []).slice(0, 8)))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [termo, aberto]);

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-autocomplete="list"
        value={texto}
        placeholder="Buscar organização"
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          if (valor) aoEscolher(null);
        }}
        className={classeCampo}
      />
      {aberto && termo.trim().length >= 2 && (
        <ul id={idLista} role="listbox" className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-pipe-border bg-white py-1 shadow-lg">
          {opcoes.map((o) => (
            <li key={o.id} role="option" aria-selected={valor?.id === o.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  aoEscolher({ id: o.id, nome: o.nome });
                  setTexto(o.nome);
                  setAberto(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-pipe-bg"
              >
                <span className="text-pipe-ink">{o.nome}</span>
                {o.cidade && <span className="ml-2 text-xs text-pipe-muted">{o.cidade}</span>}
              </button>
            </li>
          ))}
          {aoCriarNova && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAberto(false);
                  aoCriarNova(texto.trim());
                }}
                className="w-full border-t border-pipe-border px-3 py-2 text-left text-sm text-pipe-blue hover:bg-pipe-bg"
              >
                + Cadastrar “{texto.trim()}”
              </button>
            </li>
          )}
          {opcoes.length === 0 && !aoCriarNova && <li className="px-3 py-2 text-sm text-pipe-muted">Nada encontrado.</li>}
        </ul>
      )}
    </div>
  );
}
