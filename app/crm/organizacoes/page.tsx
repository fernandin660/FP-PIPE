"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MolduraCrm from "../../../components/crm/MolduraCrm";
import NovaOrganizacao from "../../../components/crm/NovaOrganizacao";
import { Aviso, BotaoPrimario, classeCampo, formatarMoeda } from "../../../components/crm/ui";
import { useAtraso } from "../../../components/crm/useCamposPersonalizados";

type Organizacao = {
  id: string;
  nome: string;
  cnpj: string | null;
  segmento: string | null;
  cidade: string | null;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  negocios_abertos: number;
  valor_aberto: number;
  negocios_ganhos: number;
  pessoas: number;
  atualizado_em: string;
};

export default function PaginaOrganizacoes() {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useAtraso(busca);
  const [escopo, setEscopo] = useState<"crm" | "todas">("crm");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<{ total: number; por_pagina: number; organizacoes: Organizacao[] } | null>(null);
  const [erro, setErro] = useState("");
  const [nova, setNova] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const q = new URLSearchParams({ escopo, pagina: String(pagina) });
      if (buscaAtrasada.trim()) q.set("busca", buscaAtrasada.trim());
      const res = await fetch(`/api/crm/organizacoes?${q}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível carregar.");
      setDados(d);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar.");
    }
  }, [escopo, pagina, buscaAtrasada]);

  useEffect(() => {
    // Carrega fora do ciclo do efeito (evita renderização em cascata).
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / dados.por_pagina)) : 1;

  return (
    <MolduraCrm titulo="Organizações" acoes={<BotaoPrimario onClick={() => setNova(true)}>+ Organização</BotaoPrimario>}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por nome, CNPJ ou cidade"
          aria-label="Buscar organizações"
          className={`${classeCampo} max-w-sm`}
        />
        <div role="group" aria-label="Quais organizações mostrar" className="flex rounded-full border border-pipe-border bg-white p-1 text-sm">
          {(
            [
              ["crm", "No CRM"],
              ["todas", "Todas as empresas"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              aria-pressed={escopo === v}
              onClick={() => {
                setEscopo(v);
                setPagina(1);
              }}
              className={`rounded-full px-3 py-1.5 ${escopo === v ? "bg-pipe-ink text-white" : "text-pipe-ink-soft hover:text-pipe-ink"}`}
            >
              {r}
            </button>
          ))}
        </div>
        {dados && <span className="text-sm text-pipe-muted">{dados.total.toLocaleString("pt-BR")} organizações</span>}
      </div>

      {erro && <Aviso>{erro}</Aviso>}

      <div className="overflow-x-auto rounded-2xl border border-pipe-border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-pipe-border text-left text-xs text-pipe-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              <th className="px-4 py-3 font-medium">Segmento</th>
              <th className="px-4 py-3 text-right font-medium">Pessoas</th>
              <th className="px-4 py-3 text-right font-medium">Negócios abertos</th>
              <th className="px-4 py-3 text-right font-medium">Valor em aberto</th>
            </tr>
          </thead>
          <tbody>
            {!dados &&
              [0, 1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-pipe-border/60">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-pipe-bg" />
                  </td>
                </tr>
              ))}
            {dados?.organizacoes.map((o) => (
              <tr
                key={o.id}
                onClick={() => router.push(`/crm/organizacoes/${o.id}`)}
                className="cursor-pointer border-b border-pipe-border/60 last:border-0 hover:bg-pipe-bg/60"
              >
                <td className="px-4 py-3">
                  <Link href={`/crm/organizacoes/${o.id}`} className="font-medium text-pipe-ink hover:text-pipe-blue" onClick={(e) => e.stopPropagation()}>
                    {o.nome}
                  </Link>
                  {o.origem === "site" && <span className="ml-2 rounded-full bg-pipe-bg px-2 py-0.5 text-[11px] text-pipe-ink-soft">Site</span>}
                </td>
                <td className="px-4 py-3 text-pipe-ink-soft">{o.cidade ?? "—"}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-pipe-ink-soft">{o.segmento ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{o.pessoas || "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{o.negocios_abertos || "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{o.valor_aberto ? formatarMoeda(o.valor_aberto) : "—"}</td>
              </tr>
            ))}
            {dados && dados.organizacoes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-pipe-muted">
                  {busca ? "Nada encontrado para essa busca." : "Nenhuma organização no CRM ainda. Adicione empresas das suas listas ou cadastre uma."}
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

      <NovaOrganizacao
        key={String(nova)}
        aberta={nova}
        aoFechar={() => setNova(false)}
        aoCriar={(id) => router.push(`/crm/organizacoes/${id}`)}
      />
    </MolduraCrm>
  );
}
