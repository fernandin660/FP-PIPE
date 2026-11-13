"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import MolduraCrm from "../../../../../components/crm/MolduraCrm";
import SeletorOrganizacao from "../../../../../components/crm/SeletorOrganizacao";
import { Aviso, BlocoCampos, BotaoPrimario, BotaoSecundario, Janela, Rotulo, classeCampo, formatarMoeda } from "../../../../../components/crm/ui";
import { useCamposPersonalizados } from "../../../../../components/crm/useCamposPersonalizados";

type Ficha = {
  pessoa: {
    id: string;
    nome: string | null;
    cargo: string | null;
    email: string | null;
    telefone: string | null;
    emails_extras: string[];
    telefones_extras: string[];
    linkedin_url: string | null;
    observacoes: string | null;
    organizacao: { id: string | null; nome: string } | null;
    campos: Record<string, unknown>;
  };
  negocios: { id: string; titulo: string | null; company_id: string; etapa: string | null; cor: string | null; valor_oportunidade: number | null }[];
};

export default function PaginaPessoa({ params }: PageProps<"/crm/pessoas/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const campos = useCamposPersonalizados("pessoa");
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [r, setR] = useState<Record<string, string>>({});
  const [org, setOrg] = useState<{ id: string; nome: string } | null>(null);
  const [rCampos, setRCampos] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/crm/pessoas/${id}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok) return setErro(d?.erro ?? "Não foi possível carregar a pessoa.");
    setFicha(d);
  }, [id]);

  useEffect(() => {
    // Carrega fora do ciclo do efeito (evita renderização em cascata).
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  function abrirEdicao() {
    if (!ficha) return;
    const p = ficha.pessoa;
    setR({
      nome: p.nome ?? "",
      cargo: p.cargo ?? "",
      email: p.email ?? "",
      telefone: p.telefone ?? "",
      linkedin_url: p.linkedin_url ?? "",
      observacoes: p.observacoes ?? "",
    });
    setOrg(p.organizacao?.id ? { id: p.organizacao.id, nome: p.organizacao.nome } : null);
    setRCampos({ ...p.campos });
    setEditando(true);
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/crm/pessoas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...r, organizacao_id: org?.id ?? null, campos: rCampos }),
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

  async function excluir() {
    const res = await fetch(`/api/crm/pessoas/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/crm/pessoas");
    else setErro("Não foi possível excluir.");
  }

  const p = ficha?.pessoa;
  const campo = (k: string, rotulo: string, tipo = "text") => (
    <div>
      <Rotulo htmlFor={`p-${k}`}>{rotulo}</Rotulo>
      <input id={`p-${k}`} type={tipo} value={r[k] ?? ""} onChange={(e) => setR({ ...r, [k]: e.target.value })} className={classeCampo} />
    </div>
  );
  const linha = (rotulo: string, valor: React.ReactNode) => (
    <div className="flex gap-4 border-b border-pipe-border/60 py-2.5 last:border-0">
      <dt className="w-24 shrink-0 text-xs text-pipe-muted">{rotulo}</dt>
      <dd className="min-w-0 break-words text-sm text-pipe-ink">{valor || "—"}</dd>
    </div>
  );

  return (
    <MolduraCrm titulo={p?.nome ?? "Contato"} largura="max-w-5xl">
      <p className="-mt-4 mb-6 text-sm text-pipe-muted">
        <Link href="/crm/pessoas" className="hover:text-pipe-ink">
          ← Contatos
        </Link>
      </p>
      {erro && <Aviso>{erro}</Aviso>}
      {!p ? (
        !erro && <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="h-fit rounded-2xl border border-pipe-border bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-pipe-ink">Dados do contato</h2>
              {!editando && (
                <button onClick={abrirEdicao} className="text-sm text-pipe-blue hover:underline">
                  Editar
                </button>
              )}
            </div>
            {editando ? (
              <div className="space-y-3">
                {campo("nome", "Nome")}
                {campo("cargo", "Cargo")}
                <div>
                  <Rotulo>Organização</Rotulo>
                  <SeletorOrganizacao valor={org} aoEscolher={setOrg} />
                </div>
                {campo("email", "E-mail", "email")}
                {campo("telefone", "Telefone", "tel")}
                {campo("linkedin_url", "LinkedIn", "url")}
                <div>
                  <Rotulo htmlFor="p-obs">Observações</Rotulo>
                  <textarea id="p-obs" rows={3} value={r.observacoes ?? ""} onChange={(e) => setR({ ...r, observacoes: e.target.value })} className={classeCampo} />
                </div>
                {campos.length > 0 && (
                  <div className="border-t border-pipe-border pt-4">
                    <BlocoCampos campos={campos} valores={p.campos} editando rascunho={rCampos} aoMudarRascunho={setRCampos} />
                  </div>
                )}
                <div className="flex justify-between gap-2 pt-2">
                  <button onClick={() => setConfirmarExclusao(true)} className="text-sm text-red-700 hover:underline">
                    Excluir contato
                  </button>
                  <div className="flex gap-2">
                    <BotaoSecundario onClick={() => setEditando(false)}>Cancelar</BotaoSecundario>
                    <BotaoPrimario onClick={() => void salvar()} disabled={salvando}>
                      {salvando ? "Salvando…" : "Salvar"}
                    </BotaoPrimario>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <dl>
                  {linha("Cargo", p.cargo)}
                  {linha(
                    "Organização",
                    p.organizacao &&
                      (p.organizacao.id ? (
                        <Link href={`/crm/organizacoes/${p.organizacao.id}`} className="text-pipe-blue hover:underline">
                          {p.organizacao.nome}
                        </Link>
                      ) : (
                        p.organizacao.nome
                      ))
                  )}
                  {linha("E-mail", p.email && <a href={`mailto:${p.email}`} className="hover:text-pipe-blue">{p.email}</a>)}
                  {p.emails_extras.length > 0 && linha("Outros e-mails", p.emails_extras.join(", "))}
                  {linha("Telefone", p.telefone && <a href={`tel:${p.telefone}`} className="hover:text-pipe-blue">{p.telefone}</a>)}
                  {p.telefones_extras.length > 0 && linha("Outros telefones", p.telefones_extras.join(", "))}
                  {linha(
                    "LinkedIn",
                    p.linkedin_url && (
                      <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-pipe-blue hover:underline">
                        Abrir perfil
                      </a>
                    )
                  )}
                  {p.observacoes && linha("Observações", p.observacoes)}
                </dl>
                {campos.length > 0 && (
                  <div className="mt-4 border-t border-pipe-border pt-4">
                    <BlocoCampos campos={campos} valores={p.campos} editando={false} rascunho={{}} aoMudarRascunho={() => {}} />
                  </div>
                )}
              </>
            )}
          </section>

          <section className="h-fit rounded-2xl border border-pipe-border bg-white">
            <h2 className="border-b border-pipe-border px-5 py-3 text-sm font-medium text-pipe-ink">
              Negócios em que é contato <span className="text-pipe-muted">· {ficha.negocios.length}</span>
            </h2>
            {ficha.negocios.length === 0 ? (
              <p className="px-5 py-6 text-sm text-pipe-muted">
                Nenhum negócio ainda. Escolha este contato no painel do negócio, no funil.
              </p>
            ) : (
              <ul className="divide-y divide-pipe-border/60">
                {ficha.negocios.map((n) => (
                  <li key={n.id}>
                    <Link href={`/crm?empresa=${n.company_id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-pipe-bg/60">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-pipe-ink">{n.titulo || "Negócio"}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-pipe-muted">
                          <span className="h-2 w-2 rounded-full" style={{ background: n.cor ?? "#c9c6bd" }} />
                          {n.etapa ? n.etapa.charAt(0) + n.etapa.slice(1).toLowerCase() : ""}
                        </span>
                      </span>
                      <span className="text-sm tabular-nums">{n.valor_oportunidade ? formatarMoeda(n.valor_oportunidade) : "—"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Janela aberta={confirmarExclusao} titulo="Excluir este contato?" aoFechar={() => setConfirmarExclusao(false)} largura="max-w-md">
        <p className="text-sm text-pipe-ink-soft">
          Os dados de contato dela serão apagados de vez, inclusive os que vieram do buscador de contatos. Os negócios continuam, só sem este contato.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <BotaoSecundario onClick={() => setConfirmarExclusao(false)}>Cancelar</BotaoSecundario>
          <button onClick={() => void excluir()} className="rounded-full bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800">
            Excluir
          </button>
        </div>
      </Janela>
    </MolduraCrm>
  );
}
