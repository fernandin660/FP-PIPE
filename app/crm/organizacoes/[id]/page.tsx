"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import MolduraCrm from "../../../../components/crm/MolduraCrm";
import NovaPessoa from "../../../../components/crm/NovaPessoa";
import NovoNegocio from "../../../../components/crm/NovoNegocio";
import { Aviso, BlocoCampos, BotaoPrimario, BotaoSecundario, Rotulo, classeCampo, formatarMoeda } from "../../../../components/crm/ui";
import { useCamposPersonalizados } from "../../../../components/crm/useCamposPersonalizados";

type Ficha = {
  organizacao: {
    id: string;
    nome: string;
    razao_social: string | null;
    nome_fantasia: string | null;
    cnpj: string | null;
    segmento_icp: string | null;
    cnae_descricao: string | null;
    porte: string | null;
    municipio: string | null;
    uf: string | null;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
    website: string | null;
    linkedin: string | null;
    origem: string | null;
    score: number | null;
    informacoes_adicionais: string | null;
    campos: Record<string, unknown>;
  };
  pessoas: { id: string; nome: string | null; cargo: string | null; email: string | null; telefone: string | null }[];
  negocios: {
    id: string;
    titulo: string | null;
    etapa: string | null;
    cor: string | null;
    funil: string | null;
    pipeline_id: string;
    valor_oportunidade: number | null;
    data_prevista: string | null;
  }[];
  historico: { id: string; tipo_evento: string; dados: Record<string, unknown>; criado_em: string }[];
};

const ROTULO_EVENTO: Record<string, string> = {
  lead_adicionado: "Entrou no funil",
  mudanca_estagio: "Mudou de etapa",
  atividade: "Atividade registrada",
  atividade_programada: "Atividade agendada",
  lead_removido: "Saiu do funil",
  cadencia_iniciada: "Cadência iniciada",
};

function formatarCnpj(c: string | null) {
  const d = (c ?? "").replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : c;
}

function dataCurta(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(iso))
    .replace(".", "");
}

export default function PaginaOrganizacao({ params }: PageProps<"/crm/organizacoes/[id]">) {
  const { id } = use(params);
  const campos = useCamposPersonalizados("organizacao");
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [rascunhoCampos, setRascunhoCampos] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);
  const [novaPessoa, setNovaPessoa] = useState(false);
  const [novoNegocio, setNovoNegocio] = useState(false);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/crm/organizacoes/${id}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setErro(d?.erro ?? "Não foi possível carregar a organização.");
      return;
    }
    setFicha(d);
  }, [id]);

  useEffect(() => {
    // Carrega fora do ciclo do efeito (evita renderização em cascata).
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  function abrirEdicao() {
    if (!ficha) return;
    const o = ficha.organizacao;
    setRascunho({
      nome_fantasia: o.nome_fantasia ?? o.nome,
      telefone: o.telefone ?? "",
      email: o.email ?? "",
      website: o.website ?? "",
      municipio: o.municipio ?? "",
      uf: o.uf ?? "",
      segmento: o.segmento_icp ?? "",
      endereco: o.endereco ?? "",
      informacoes_adicionais: o.informacoes_adicionais ?? "",
    });
    setRascunhoCampos({ ...o.campos });
    setEditando(true);
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/crm/organizacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rascunho, campos: rascunhoCampos }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível salvar.");
      setEditando(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const o = ficha?.organizacao;
  const campo = (k: string, rotulo: string, tipo = "text") => (
    <div>
      <Rotulo htmlFor={`o-${k}`}>{rotulo}</Rotulo>
      <input id={`o-${k}`} type={tipo} value={rascunho[k] ?? ""} onChange={(e) => setRascunho({ ...rascunho, [k]: e.target.value })} className={classeCampo} />
    </div>
  );
  const linha = (rotulo: string, valor: React.ReactNode) => (
    <div className="flex gap-4 border-b border-pipe-border/60 py-2.5 last:border-0">
      <dt className="w-28 shrink-0 text-xs text-pipe-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words text-sm text-pipe-ink">{valor || "—"}</dd>
    </div>
  );

  return (
    <MolduraCrm
      titulo={o?.nome ?? "Organização"}
      acoes={
        o && (
          <>
            <BotaoSecundario onClick={() => setNovaPessoa(true)}>+ Contato</BotaoSecundario>
            <BotaoPrimario onClick={() => setNovoNegocio(true)}>+ Negócio</BotaoPrimario>
          </>
        )
      }
    >
      <p className="-mt-4 mb-6 text-sm text-pipe-muted">
        <Link href="/crm/organizacoes" className="hover:text-pipe-ink">
          ← Organizações
        </Link>
      </p>
      {erro && <Aviso>{erro}</Aviso>}
      {!o ? (
        !erro && <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Dados */}
          <section className="h-fit rounded-2xl border border-pipe-border bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-pipe-ink">Dados da organização</h2>
              {!editando && (
                <button onClick={abrirEdicao} className="text-sm text-pipe-blue hover:underline">
                  Editar
                </button>
              )}
            </div>
            {editando ? (
              <div className="space-y-3">
                {campo("nome_fantasia", "Nome")}
                {campo("segmento", "Segmento")}
                {campo("telefone", "Telefone", "tel")}
                {campo("email", "E-mail", "email")}
                {campo("website", "Site", "url")}
                <div className="grid grid-cols-[1fr_96px] gap-3">
                  {campo("municipio", "Cidade")}
                  {campo("uf", "UF / país")}
                </div>
                {campo("endereco", "Endereço")}
                <div>
                  <Rotulo htmlFor="o-info">Observações</Rotulo>
                  <textarea
                    id="o-info"
                    rows={3}
                    value={rascunho.informacoes_adicionais ?? ""}
                    onChange={(e) => setRascunho({ ...rascunho, informacoes_adicionais: e.target.value })}
                    className={classeCampo}
                  />
                </div>
                {campos.length > 0 && (
                  <div className="border-t border-pipe-border pt-4">
                    <BlocoCampos campos={campos} valores={o.campos} editando rascunho={rascunhoCampos} aoMudarRascunho={setRascunhoCampos} />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <BotaoSecundario onClick={() => setEditando(false)}>Cancelar</BotaoSecundario>
                  <BotaoPrimario onClick={() => void salvar()} disabled={salvando}>
                    {salvando ? "Salvando…" : "Salvar"}
                  </BotaoPrimario>
                </div>
              </div>
            ) : (
              <>
                <dl>
                  {linha("Razão social", o.razao_social)}
                  {linha("CNPJ", formatarCnpj(o.cnpj))}
                  {linha("Segmento", o.segmento_icp)}
                  {linha("Atividade", o.cnae_descricao)}
                  {linha("Cidade", [o.municipio, o.uf].filter(Boolean).join(" / "))}
                  {linha("Endereço", o.endereco)}
                  {linha("Telefone", o.telefone && <a href={`tel:${o.telefone}`} className="hover:text-pipe-blue">{o.telefone}</a>)}
                  {linha("E-mail", o.email && <a href={`mailto:${o.email}`} className="hover:text-pipe-blue">{o.email}</a>)}
                  {linha(
                    "Site",
                    o.website && (
                      <a href={o.website} target="_blank" rel="noopener noreferrer" className="text-pipe-blue hover:underline">
                        {o.website.replace(/^https?:\/\//, "")}
                      </a>
                    )
                  )}
                  {o.score !== null && linha("Score ICP", o.score)}
                  {o.informacoes_adicionais && linha("Observações", o.informacoes_adicionais)}
                </dl>
                {campos.length > 0 && (
                  <div className="mt-4 border-t border-pipe-border pt-4">
                    <BlocoCampos campos={campos} valores={o.campos} editando={false} rascunho={{}} aoMudarRascunho={() => {}} />
                  </div>
                )}
              </>
            )}
          </section>

          <div className="space-y-6">
            {/* Negócios */}
            <section className="rounded-2xl border border-pipe-border bg-white">
              <h2 className="border-b border-pipe-border px-5 py-3 text-sm font-medium text-pipe-ink">
                Negócios <span className="text-pipe-muted">· {ficha.negocios.length}</span>
              </h2>
              {ficha.negocios.length === 0 ? (
                <p className="px-5 py-6 text-sm text-pipe-muted">Nenhum negócio com esta organização.</p>
              ) : (
                <ul className="divide-y divide-pipe-border/60">
                  {ficha.negocios.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/crm?funil=${n.pipeline_id}&empresa=${o.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-pipe-bg/60"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-pipe-ink">{n.titulo || `Negócio ${o.nome}`}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-pipe-muted">
                            <span className="h-2 w-2 rounded-full" style={{ background: n.cor ?? "#c9c6bd" }} />
                            {n.funil} · {n.etapa ? n.etapa.charAt(0) + n.etapa.slice(1).toLowerCase() : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-pipe-ink">
                          {n.valor_oportunidade ? formatarMoeda(n.valor_oportunidade) : "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Pessoas */}
            <section className="rounded-2xl border border-pipe-border bg-white">
              <h2 className="border-b border-pipe-border px-5 py-3 text-sm font-medium text-pipe-ink">
                Contatos <span className="text-pipe-muted">· {ficha.pessoas.length}</span>
              </h2>
              {ficha.pessoas.length === 0 ? (
                <p className="px-5 py-6 text-sm text-pipe-muted">
                  Ninguém cadastrado ainda.{" "}
                  <button onClick={() => setNovaPessoa(true)} className="text-pipe-blue hover:underline">
                    Adicionar contato
                  </button>
                </p>
              ) : (
                <ul className="divide-y divide-pipe-border/60">
                  {ficha.pessoas.map((p) => (
                    <li key={p.id}>
                      <Link href={`/crm/pessoas/${p.id}`} className="grid gap-1 px-5 py-3 hover:bg-pipe-bg/60 sm:grid-cols-[1fr_auto] sm:items-center">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-pipe-ink">{p.nome ?? "Sem nome"}</span>
                          <span className="block truncate text-xs text-pipe-muted">{p.cargo ?? "Cargo não informado"}</span>
                        </span>
                        <span className="text-xs text-pipe-ink-soft sm:text-right">
                          {p.email ?? ""}
                          {p.email && p.telefone ? " · " : ""}
                          {p.telefone ?? ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Histórico */}
            <section className="rounded-2xl border border-pipe-border bg-white">
              <h2 className="border-b border-pipe-border px-5 py-3 text-sm font-medium text-pipe-ink">Histórico</h2>
              {ficha.historico.length === 0 ? (
                <p className="px-5 py-6 text-sm text-pipe-muted">Sem movimentações ainda.</p>
              ) : (
                <ol className="space-y-0 px-5 py-2">
                  {ficha.historico.map((h) => (
                    <li key={h.id} className="flex gap-4 border-b border-pipe-border/50 py-2.5 text-sm last:border-0">
                      <span className="w-24 shrink-0 text-xs text-pipe-muted">{dataCurta(h.criado_em)}</span>
                      <span className="text-pipe-ink-soft">
                        {ROTULO_EVENTO[h.tipo_evento] ?? h.tipo_evento}
                        {typeof h.dados?.titulo === "string" && <span className="text-pipe-ink"> · {h.dados.titulo}</span>}
                        {typeof h.dados?.motivo_perda === "string" && <span className="text-red-700"> · {h.dados.motivo_perda}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}

      {o && (
        <>
          <NovaPessoa
            key={`np-${novaPessoa}`}
            aberta={novaPessoa}
            organizacao={{ id: o.id, nome: o.nome }}
            aoFechar={() => setNovaPessoa(false)}
            aoCriar={() => {
              setNovaPessoa(false);
              void carregar();
            }}
          />
          <NovoNegocio
            key={`nn-${novoNegocio}`}
            aberto={novoNegocio}
            organizacao={{ id: o.id, nome: o.nome }}
            aoFechar={() => setNovoNegocio(false)}
            aoCriar={() => {
              setNovoNegocio(false);
              void carregar();
            }}
          />
        </>
      )}
    </MolduraCrm>
  );
}
