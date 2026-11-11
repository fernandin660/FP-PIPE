"use client";

import { useEffect, useState } from "react";
import { Aviso, BotaoPrimario, BotaoSecundario, Janela, Rotulo, classeCampo } from "./ui";
import SeletorOrganizacao from "./SeletorOrganizacao";
import NovaOrganizacao from "./NovaOrganizacao";

type FunilComEtapas = { id: string; nome: string; etapas: { id: string; nome: string }[] };
type PessoaOpcao = { id: string; nome: string | null; cargo: string | null };

/** Criar um negócio: organização, título, valor, funil/etapa, pessoa e previsão. */
export default function NovoNegocio({
  aberto,
  aoFechar,
  aoCriar,
  organizacao,
  funilInicial,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (negocio: { id: string; company_id: string; pipeline_id: string }) => void;
  organizacao?: { id: string; nome: string } | null;
  funilInicial?: string | null;
}) {
  const [org, setOrg] = useState<{ id: string; nome: string } | null>(organizacao ?? null);
  const [criandoOrg, setCriandoOrg] = useState<string | null>(null);
  const [funis, setFunis] = useState<FunilComEtapas[]>([]);
  const [funilId, setFunilId] = useState(funilInicial ?? "");
  const [etapaId, setEtapaId] = useState("");
  const [pessoas, setPessoas] = useState<PessoaOpcao[]>([]);
  const [f, setF] = useState({ titulo: "", valor: "", pessoa_id: "", data_prevista: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!aberto) return;
    fetch("/api/crm/funis", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { funis: [] }))
      .then((d: { funis?: FunilComEtapas[] }) => {
        const lista = d.funis ?? [];
        setFunis(lista);
        const escolhido = lista.find((x) => x.id === funilInicial) ?? lista[0];
        if (escolhido) {
          setFunilId(escolhido.id);
          setEtapaId(escolhido.etapas[0]?.id ?? "");
        }
      })
      .catch(() => {});
  }, [aberto, funilInicial]);

  useEffect(() => {
    if (!org) return;
    let vivo = true;
    fetch(`/api/crm/pessoas?organizacao=${org.id}`)
      .then((r) => (r.ok ? r.json() : { pessoas: [] }))
      .then((d: { pessoas?: PessoaOpcao[] }) => vivo && setPessoas(d.pessoas ?? []))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [org]);

  const etapas = funis.find((x) => x.id === funilId)?.etapas ?? [];

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return setErro("Escolha a organização do negócio.");
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: org.id,
          pipeline_id: funilId || undefined,
          stage_id: etapaId || undefined,
          titulo: f.titulo || undefined,
          valor_oportunidade: f.valor ? Number(f.valor) : null,
          pessoa_id: f.pessoa_id || null,
          data_prevista: f.data_prevista || null,
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível criar o negócio.");
      aoCriar({ id: d.lead.id, company_id: d.lead.company_id, pipeline_id: d.lead.pipeline_id });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar o negócio.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Janela aberta={aberto && !criandoOrg} titulo="Novo negócio" aoFechar={aoFechar}>
        <form onSubmit={salvar} className="space-y-4">
          <div>
            <Rotulo>Organização *</Rotulo>
            {organizacao ? (
              <p className="rounded-lg border border-pipe-border bg-pipe-bg px-3 py-2.5 text-sm text-pipe-ink">{organizacao.nome}</p>
            ) : (
              <SeletorOrganizacao valor={org} aoEscolher={setOrg} aoCriarNova={(nome) => setCriandoOrg(nome)} />
            )}
          </div>
          <div>
            <Rotulo htmlFor="n-titulo">Título do negócio</Rotulo>
            <input
              id="n-titulo"
              value={f.titulo}
              placeholder={org ? `Negócio ${org.nome}` : "Ex.: Contrato anual de software"}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              className={classeCampo}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="n-valor">Valor (R$)</Rotulo>
              <input id="n-valor" type="number" min="0" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} className={classeCampo} />
            </div>
            <div>
              <Rotulo htmlFor="n-data">Previsão de fechamento</Rotulo>
              <input id="n-data" type="date" value={f.data_prevista} onChange={(e) => setF({ ...f, data_prevista: e.target.value })} className={classeCampo} />
            </div>
            {funis.length > 1 && (
              <div>
                <Rotulo htmlFor="n-funil">Funil</Rotulo>
                <select
                  id="n-funil"
                  value={funilId}
                  onChange={(e) => {
                    setFunilId(e.target.value);
                    setEtapaId(funis.find((x) => x.id === e.target.value)?.etapas[0]?.id ?? "");
                  }}
                  className={classeCampo}
                >
                  {funis.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={funis.length > 1 ? "" : "sm:col-span-2"}>
              <Rotulo htmlFor="n-etapa">Etapa</Rotulo>
              <select id="n-etapa" value={etapaId} onChange={(e) => setEtapaId(e.target.value)} className={classeCampo}>
                {etapas.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome.charAt(0) + x.nome.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Rotulo htmlFor="n-pessoa">Pessoa de contato</Rotulo>
              <select
                id="n-pessoa"
                value={f.pessoa_id}
                disabled={!org}
                onChange={(e) => setF({ ...f, pessoa_id: e.target.value })}
                className={classeCampo}
              >
                <option value="">{org ? (pessoas.length ? "Nenhuma" : "Nenhuma pessoa nesta organização") : "Escolha a organização primeiro"}</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome ?? "Sem nome"}
                    {p.cargo ? ` · ${p.cargo}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {erro && <Aviso>{erro}</Aviso>}
          <div className="flex justify-end gap-2 pt-2">
            <BotaoSecundario type="button" onClick={aoFechar}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario type="submit" disabled={salvando || !org}>
              {salvando ? "Salvando…" : "Criar negócio"}
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
