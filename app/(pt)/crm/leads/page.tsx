"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import MolduraCrm from "../../../../components/crm/MolduraCrm";
import NovaOrganizacao from "../../../../components/crm/NovaOrganizacao";
import SeletorOrganizacao from "../../../../components/crm/SeletorOrganizacao";
import { Aviso, BotaoPrimario, BotaoSecundario, Janela, Rotulo, classeCampo, formatarMoeda } from "../../../../components/crm/ui";
import { useAtraso } from "../../../../components/crm/useCamposPersonalizados";

type Lead = {
  id: string;
  titulo: string;
  company_id: string | null;
  pessoa_id: string | null;
  responsavel_id: string | null;
  valor: number | null;
  origem: string;
  etiqueta: "quente" | "morno" | "frio" | null;
  observacao: string | null;
  status: "aberto" | "arquivado" | "convertido";
  negocio_id: string | null;
  criado_em: string;
  organizacao: { id: string; nome: string; municipio: string | null; uf: string | null; telefone: string | null; segmento: string | null } | null;
  pessoa: { id: string; nome: string | null; cargo: string | null; email: string | null; telefone: string | null } | null;
  responsavel_nome: string | null;
  criado_por_nome: string | null;
};
type Membro = { usuario_id: string; nome: string | null; email: string | null };
type Resposta = {
  leads: Lead[];
  totais: Record<string, number>;
  funis: { id: string; nome: string }[];
  etapas: { id: string; nome: string; pipeline_id: string }[];
  membros: Membro[];
};

const ETIQUETAS: Record<string, { rotulo: string; cor: string }> = {
  quente: { rotulo: "Quente", cor: "#dc2626" },
  morno: { rotulo: "Morno", cor: "#d97706" },
  frio: { rotulo: "Frio", cor: "#2442e5" },
};
const ORIGENS: Record<string, string> = {
  manual: "Manual",
  lista: "Listas",
  busca_empresa: "Busca de empresas",
  busca_contato: "Busca de contatos",
  importacao: "Importação",
  site: "Site",
};

function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" }).format(new Date(iso)).replace(".", "");
}
function etapaLegivel(nome: string): string {
  return nome.charAt(0) + nome.slice(1).toLowerCase();
}

export default function CaixaDeEntrada() {
  const router = useRouter();
  const [status, setStatus] = useState<Lead["status"]>("aberto");
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useAtraso(busca);
  const [responsavel, setResponsavel] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [editando, setEditando] = useState<Lead | "novo" | null>(null);
  const [convertendo, setConvertendo] = useState<Lead | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/leads?status=${status}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível carregar a caixa de entrada.");
      setDados(d);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a caixa de entrada.");
    }
  }, [status]);

  useEffect(() => {
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  const linhas = useMemo(() => {
    const t = buscaAtrasada.trim().toLowerCase();
    return (dados?.leads ?? []).filter((l) => {
      if (responsavel && l.responsavel_id !== responsavel) return false;
      if (etiqueta && (l.etiqueta ?? "") !== (etiqueta === "sem" ? "" : etiqueta)) return false;
      if (!t) return true;
      return [l.titulo, l.organizacao?.nome, l.pessoa?.nome, l.organizacao?.municipio].filter(Boolean).join(" ").toLowerCase().includes(t);
    });
  }, [dados, buscaAtrasada, responsavel, etiqueta]);

  async function mudarStatus(l: Lead, novo: "aberto" | "arquivado") {
    const res = await fetch(`/api/crm/leads/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novo }),
    });
    const d = await res.json().catch(() => null);
    setAviso(res.ok ? (novo === "arquivado" ? `"${l.titulo}" arquivado.` : `"${l.titulo}" voltou para a caixa de entrada.`) : d?.erro ?? "Não foi possível alterar.");
    void carregar();
  }

  return (
    <MolduraCrm
      titulo="Caixa de entrada"
      acoes={
        <>
          <BotaoSecundario onClick={() => router.push("/listas")}>Trazer das listas</BotaoSecundario>
          <BotaoPrimario onClick={() => setEditando("novo")}>+ Lead</BotaoPrimario>
        </>
      }
    >
      <p className="-mt-3 mb-5 max-w-2xl text-sm text-pipe-muted">
        Leads ainda não qualificados. Quando um lead mostrar interesse de verdade, transforme em negócio e ele entra no funil.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Situação" className="inline-flex rounded-full border border-pipe-border bg-white p-0.5 text-sm">
          {(
            [
              ["aberto", "Abertos"],
              ["arquivado", "Arquivados"],
              ["convertido", "Viraram negócio"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              role="tab"
              aria-selected={status === v}
              onClick={() => setStatus(v)}
              className={`rounded-full px-3.5 py-1.5 ${status === v ? "bg-pipe-ink font-medium text-white" : "text-pipe-muted hover:text-pipe-ink"}`}
            >
              {r}
              {dados?.totais?.[v] ? <span className="ml-1.5 tabular-nums opacity-70">{dados.totais[v]}</span> : null}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lead, organização, pessoa…"
          aria-label="Buscar leads"
          className="min-w-[200px] flex-1 rounded-full border border-pipe-border bg-white px-4 py-2 text-sm text-pipe-ink placeholder:text-pipe-muted/70 focus:border-pipe-blue focus:outline-none"
        />
        <select
          aria-label="Responsável"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink"
        >
          <option value="">Toda a equipe</option>
          {dados?.membros.map((m) => (
            <option key={m.usuario_id} value={m.usuario_id}>
              {m.nome || m.email}
            </option>
          ))}
        </select>
        <select aria-label="Etiqueta" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink">
          <option value="">Todas as etiquetas</option>
          {Object.entries(ETIQUETAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.rotulo}
            </option>
          ))}
          <option value="sem">Sem etiqueta</option>
        </select>
      </div>

      {aviso && (
        <div className="mb-3">
          <Aviso tipo="ok">{aviso}</Aviso>
        </div>
      )}
      {erro && (
        <div className="mb-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-pipe-border bg-pipe-card">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-pipe-border text-left text-xs text-pipe-muted">
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-3 py-3 font-medium">Pessoa</th>
              <th className="px-3 py-3 font-medium">Etiqueta</th>
              <th className="px-3 py-3 text-right font-medium">Valor</th>
              <th className="px-3 py-3 font-medium">Responsável</th>
              <th className="px-3 py-3 font-medium">Origem</th>
              <th className="px-3 py-3 font-medium">Entrou</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {!dados && !erro && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-pipe-muted">
                  Carregando…
                </td>
              </tr>
            )}
            {dados && linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-pipe-muted">
                  {status === "aberto" ? (
                    <>
                      A caixa de entrada está vazia. Crie um lead ou mande empresas das suas{" "}
                      <Link href="/listas" className="text-pipe-blue hover:underline">
                        listas
                      </Link>{" "}
                      para cá.
                    </>
                  ) : (
                    "Nada por aqui."
                  )}
                </td>
              </tr>
            )}
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-pipe-border/70 last:border-0 hover:bg-pipe-bg/60">
                <td className="max-w-[300px] px-4 py-3">
                  <button onClick={() => setEditando(l)} className="block max-w-full truncate text-left font-medium text-pipe-ink hover:text-pipe-blue">
                    {l.titulo}
                  </button>
                  <p className="truncate text-xs text-pipe-muted">
                    {l.organizacao ? (
                      <Link href={`/crm/organizacoes/${l.organizacao.id}`} className="hover:text-pipe-ink">
                        {l.organizacao.nome}
                      </Link>
                    ) : (
                      "Sem organização"
                    )}
                    {l.organizacao?.municipio ? ` · ${l.organizacao.municipio}` : ""}
                  </p>
                </td>
                <td className="max-w-[180px] truncate px-3 py-3 text-pipe-ink-soft">
                  {l.pessoa?.nome ?? "—"}
                  {l.pessoa?.cargo && <span className="block truncate text-xs text-pipe-muted">{l.pessoa.cargo}</span>}
                </td>
                <td className="px-3 py-3">
                  {l.etiqueta ? (
                    <span className="inline-flex items-center gap-1.5 text-pipe-ink-soft">
                      <span className="h-2 w-2 rounded-full" style={{ background: ETIQUETAS[l.etiqueta].cor }} aria-hidden="true" />
                      {ETIQUETAS[l.etiqueta].rotulo}
                    </span>
                  ) : (
                    <span className="text-pipe-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-pipe-ink-soft">{l.valor != null ? formatarMoeda(l.valor) : "—"}</td>
                <td className="px-3 py-3 text-pipe-ink-soft">{l.responsavel_nome ?? "—"}</td>
                <td className="px-3 py-3 text-pipe-muted">{ORIGENS[l.origem] ?? l.origem}</td>
                <td className="px-3 py-3 tabular-nums text-pipe-muted" title={l.criado_por_nome ? `Por ${l.criado_por_nome}` : undefined}>
                  {dataCurta(l.criado_em)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  {l.status === "aberto" && (
                    <>
                      <button onClick={() => setConvertendo(l)} className="rounded-full bg-pipe-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-black">
                        Virar negócio
                      </button>
                      <button onClick={() => void mudarStatus(l, "arquivado")} className="ml-1 rounded-full px-3 py-1.5 text-xs text-pipe-muted hover:bg-pipe-dark hover:text-pipe-ink">
                        Arquivar
                      </button>
                    </>
                  )}
                  {l.status === "arquivado" && (
                    <button onClick={() => void mudarStatus(l, "aberto")} className="rounded-full border border-pipe-border px-3 py-1.5 text-xs text-pipe-ink hover:border-pipe-ink/40">
                      Reabrir
                    </button>
                  )}
                  {l.status === "convertido" && l.company_id && (
                    <Link href={`/crm?empresa=${l.company_id}`} className="rounded-full border border-pipe-border px-3 py-1.5 text-xs text-pipe-ink hover:border-pipe-ink/40">
                      Ver negócio
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && dados && (
        <JanelaLead
          lead={editando === "novo" ? null : editando}
          membros={dados.membros}
          aoFechar={() => setEditando(null)}
          aoSalvar={(msg) => {
            setEditando(null);
            setAviso(msg);
            void carregar();
          }}
        />
      )}
      {convertendo && dados && (
        <JanelaConverter
          lead={convertendo}
          funis={dados.funis}
          etapas={dados.etapas}
          aoFechar={() => setConvertendo(null)}
          aoConverter={(_companyId, jaExistia) => {
            setConvertendo(null);
            setAviso(
              jaExistia
                ? `"${convertendo.titulo}" já tinha um negócio nesse funil; o lead foi ligado a ele.`
                : `"${convertendo.titulo}" virou negócio.`
            );
            void carregar();
          }}
        />
      )}
    </MolduraCrm>
  );
}

function JanelaLead({
  lead,
  membros,
  aoFechar,
  aoSalvar,
}: {
  lead: Lead | null;
  membros: Membro[];
  aoFechar: () => void;
  aoSalvar: (mensagem: string) => void;
}) {
  const [org, setOrg] = useState<{ id: string; nome: string } | null>(lead?.organizacao ? { id: lead.organizacao.id, nome: lead.organizacao.nome } : null);
  const [criandoOrg, setCriandoOrg] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState<{ id: string; nome: string | null; cargo: string | null }[]>([]);
  const [f, setF] = useState({
    titulo: lead?.titulo ?? "",
    pessoa_id: lead?.pessoa_id ?? "",
    valor: lead?.valor != null ? String(lead.valor) : "",
    etiqueta: lead?.etiqueta ?? "",
    responsavel_id: lead?.responsavel_id ?? "",
    observacao: lead?.observacao ?? "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!org) return;
    let vivo = true;
    fetch(`/api/crm/pessoas?organizacao=${org.id}`)
      .then((r) => (r.ok ? r.json() : { pessoas: [] }))
      .then((d: { pessoas?: { id: string; nome: string | null; cargo: string | null }[] }) => vivo && setPessoas(d.pessoas ?? []))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [org]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const titulo = f.titulo.trim() || org?.nome || "";
    if (!titulo) return setErro("Dê um título ao lead ou escolha a organização.");
    setSalvando(true);
    setErro("");
    const corpo = {
      titulo,
      company_id: org?.id ?? null,
      pessoa_id: f.pessoa_id || null,
      valor: f.valor ? Number(f.valor) : null,
      etiqueta: f.etiqueta || null,
      observacao: f.observacao,
      ...(f.responsavel_id ? { responsavel_id: f.responsavel_id } : {}),
    };
    try {
      const res = await fetch(lead ? `/api/crm/leads/${lead.id}` : "/api/crm/leads", {
        method: lead ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead ? corpo : { ...corpo, company_id: org?.id ?? undefined, pessoa_id: f.pessoa_id || undefined }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível salvar o lead.");
      aoSalvar(lead ? "Lead atualizado." : `Lead "${titulo}" criado.`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar o lead.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Janela aberta={criandoOrg === null} titulo={lead ? "Editar lead" : "Novo lead"} aoFechar={aoFechar}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <Rotulo>Organização</Rotulo>
            <SeletorOrganizacao
              valor={org}
              aoEscolher={(o) => {
                setOrg(o);
                setPessoas([]);
                setF((x) => ({ ...x, pessoa_id: "" }));
              }}
              aoCriarNova={(nome) => setCriandoOrg(nome)}
            />
          </div>
          <div>
            <Rotulo htmlFor="l-titulo">Título</Rotulo>
            <input
              id="l-titulo"
              value={f.titulo}
              placeholder={org ? org.nome : "Ex.: Padaria interessada em site"}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              className={classeCampo}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Rotulo htmlFor="l-pessoa">Pessoa de contato</Rotulo>
              <select id="l-pessoa" value={f.pessoa_id} disabled={!org} onChange={(e) => setF({ ...f, pessoa_id: e.target.value })} className={classeCampo}>
                <option value="">{org ? (pessoas.length ? "Nenhuma" : "Nenhuma pessoa nesta organização") : "Escolha a organização primeiro"}</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome ?? "Sem nome"}
                    {p.cargo ? ` · ${p.cargo}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Rotulo htmlFor="l-valor">Valor estimado (R$)</Rotulo>
              <input id="l-valor" type="number" min="0" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className={classeCampo} />
            </div>
            <div>
              <Rotulo htmlFor="l-etiqueta">Etiqueta</Rotulo>
              <select id="l-etiqueta" value={f.etiqueta} onChange={(e) => setF({ ...f, etiqueta: e.target.value })} className={classeCampo}>
                <option value="">Sem etiqueta</option>
                {Object.entries(ETIQUETAS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Rotulo htmlFor="l-resp">Responsável</Rotulo>
              <select id="l-resp" value={f.responsavel_id} onChange={(e) => setF({ ...f, responsavel_id: e.target.value })} className={classeCampo}>
                <option value="">{lead ? "Manter" : "Eu"}</option>
                {membros.map((m) => (
                  <option key={m.usuario_id} value={m.usuario_id}>
                    {m.nome || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Rotulo htmlFor="l-obs">Observação</Rotulo>
              <textarea id="l-obs" rows={3} value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} className={classeCampo} />
            </div>
          </div>
          {erro && <Aviso>{erro}</Aviso>}
          <div className="flex justify-end gap-2 pt-2">
            <BotaoSecundario type="button" onClick={aoFechar}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : lead ? "Salvar" : "Criar lead"}
            </BotaoPrimario>
          </div>
        </form>
      </Janela>
      {criandoOrg !== null && (
        <NovaOrganizacao
          aberta
          nomeInicial={criandoOrg}
          aoFechar={() => setCriandoOrg(null)}
          aoCriar={(id, nome) => {
            setOrg({ id, nome });
            setCriandoOrg(null);
          }}
        />
      )}
    </>
  );
}

function JanelaConverter({
  lead,
  funis,
  etapas,
  aoFechar,
  aoConverter,
}: {
  lead: Lead;
  funis: { id: string; nome: string }[];
  etapas: { id: string; nome: string; pipeline_id: string }[];
  aoFechar: () => void;
  aoConverter: (companyId: string | null, jaExistia: boolean) => void;
}) {
  const [funilId, setFunilId] = useState(funis[0]?.id ?? "");
  const etapasDoFunil = etapas.filter((e) => e.pipeline_id === funilId);
  const [etapaId, setEtapaId] = useState(etapasDoFunil[0]?.id ?? "");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_id: funilId, stage_id: etapaId }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível criar o negócio.");
      aoConverter(lead.company_id, Boolean(d.ja_existia));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar o negócio.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Janela aberta titulo="Transformar em negócio" aoFechar={aoFechar}>
      <div className="space-y-4">
        <p className="text-sm text-pipe-ink-soft">
          <span className="font-medium text-pipe-ink">{lead.titulo}</span>
          {lead.organizacao ? ` · ${lead.organizacao.nome}` : ""} entra no funil com o mesmo responsável, valor e pessoa de contato.
        </p>
        {!lead.company_id && <Aviso>Este lead ainda não tem organização. Edite o lead e escolha uma antes de transformar em negócio.</Aviso>}
        {funis.length > 1 && (
          <div>
            <Rotulo htmlFor="c-funil">Funil</Rotulo>
            <select
              id="c-funil"
              value={funilId}
              onChange={(e) => {
                setFunilId(e.target.value);
                setEtapaId(etapas.find((x) => x.pipeline_id === e.target.value)?.id ?? "");
              }}
              className={classeCampo}
            >
              {funis.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <Rotulo htmlFor="c-etapa">Etapa</Rotulo>
          <select id="c-etapa" value={etapaId} onChange={(e) => setEtapaId(e.target.value)} className={classeCampo}>
            {etapasDoFunil.map((e) => (
              <option key={e.id} value={e.id}>
                {etapaLegivel(e.nome)}
              </option>
            ))}
          </select>
        </div>
        {erro && <Aviso>{erro}</Aviso>}
        <div className="flex justify-end gap-2">
          <BotaoSecundario onClick={aoFechar}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={confirmar} disabled={enviando || !lead.company_id}>
            {enviando ? "Criando…" : "Criar negócio"}
          </BotaoPrimario>
        </div>
      </div>
    </Janela>
  );
}
