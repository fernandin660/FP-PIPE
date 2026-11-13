"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MolduraCrm from "../../../../components/crm/MolduraCrm";
import NovaPessoa from "../../../../components/crm/NovaPessoa";
import { Aviso, BotaoPrimario, classeCampo } from "../../../../components/crm/ui";
import { useAtraso } from "../../../../components/crm/useCamposPersonalizados";

type Pessoa = {
  id: string;
  nome: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  organizacao_id: string | null;
  organizacao: string | null;
  negocios: number;
};

export default function PaginaPessoas() {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useAtraso(busca);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<{ total: number; por_pagina: number; pessoas: Pessoa[] } | null>(null);
  const [erro, setErro] = useState("");
  const [nova, setNova] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const q = new URLSearchParams({ pagina: String(pagina) });
      if (buscaAtrasada.trim()) q.set("busca", buscaAtrasada.trim());
      const res = await fetch(`/api/crm/pessoas?${q}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível carregar.");
      setDados(d);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar.");
    }
  }, [pagina, buscaAtrasada]);

  useEffect(() => {
    // Carrega fora do ciclo do efeito (evita renderização em cascata).
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / dados.por_pagina)) : 1;

  return (
    <MolduraCrm titulo="Contatos" acoes={<BotaoPrimario onClick={() => setNova(true)}>+ Contato</BotaoPrimario>}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por nome, cargo, e-mail ou empresa"
          aria-label="Buscar contatos"
          className={`${classeCampo} max-w-sm`}
        />
        {dados && <span className="text-sm text-pipe-muted">{dados.total.toLocaleString("pt-BR")} contatos</span>}
      </div>

      {erro && <Aviso>{erro}</Aviso>}

      <div className="overflow-x-auto rounded-2xl border border-pipe-border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-pipe-border text-left text-xs text-pipe-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Organização</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 text-right font-medium">Negócios</th>
            </tr>
          </thead>
          <tbody>
            {!dados &&
              [0, 1, 2].map((i) => (
                <tr key={i} className="border-b border-pipe-border/60">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-pipe-bg" />
                  </td>
                </tr>
              ))}
            {dados?.pessoas.map((p) => (
              <tr key={p.id} onClick={() => router.push(`/crm/pessoas/${p.id}`)} className="cursor-pointer border-b border-pipe-border/60 last:border-0 hover:bg-pipe-bg/60">
                <td className="px-4 py-3">
                  <Link href={`/crm/pessoas/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-pipe-ink hover:text-pipe-blue">
                    {p.nome ?? "Sem nome"}
                  </Link>
                  {p.cargo && <span className="block text-xs text-pipe-muted">{p.cargo}</span>}
                </td>
                <td className="px-4 py-3 text-pipe-ink-soft">
                  {p.organizacao_id ? (
                    <Link href={`/crm/organizacoes/${p.organizacao_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-pipe-blue">
                      {p.organizacao}
                    </Link>
                  ) : (
                    p.organizacao ?? "—"
                  )}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-pipe-ink-soft">{p.email ?? "—"}</td>
                <td className="px-4 py-3 text-pipe-ink-soft">{p.telefone ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{p.negocios || "—"}</td>
              </tr>
            ))}
            {dados && dados.pessoas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-pipe-muted">
                  {busca ? "Nada encontrado para essa busca." : "Nenhum contato cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="rounded-full border border-pipe-border px-3 py-1.5 disabled:opacity-40">
            ← Anterior
          </button>
          <span className="text-pipe-muted">
            {pagina} de {totalPaginas}
          </span>
          <button disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)} className="rounded-full border border-pipe-border px-3 py-1.5 disabled:opacity-40">
            Próxima →
          </button>
        </div>
      )}

      <NovaPessoa key={String(nova)} aberta={nova} aoFechar={() => setNova(false)} aoCriar={(id) => router.push(`/crm/pessoas/${id}`)} />
    </MolduraCrm>
  );
}
