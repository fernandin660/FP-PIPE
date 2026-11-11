"use client";

import { useCallback, useEffect, useState } from "react";
import MolduraCrm from "../../../components/crm/MolduraCrm";
import { Aviso, BotaoPrimario, BotaoSecundario, Janela, Rotulo, classeCampo } from "../../../components/crm/ui";
import { ENTIDADES_CAMPO, TIPOS_CAMPO, type CampoPersonalizado, type EntidadeCampo, type TipoCampo } from "../../../lib/crm-campos";

type Etapa = { id: string; nome: string; cor: string; probabilidade: number | null; ordem_estagio: number; negocios: number };
type Funil = { id: string; nome: string; ordem: number; negocios: number; etapas: Etapa[] };

const CORES = ["#94a3b8", "#3b82f6", "#22c55e", "#eab308", "#06b6d4", "#8b5cf6", "#f97316", "#10b981", "#16a34a", "#ef4444", "#2442e5", "#111114"];

async function chamar(url: string, metodo: string, corpo?: unknown) {
  const res = await fetch(url, {
    method: metodo,
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const d = await res.json().catch(() => null);
  if (!res.ok) throw new Error(d?.erro ?? "Não foi possível salvar.");
  return d;
}

export default function PaginaConfiguracoes() {
  const [aba, setAba] = useState<"funis" | "campos">("funis");
  const [ehAdmin, setEhAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEhAdmin(d?.papel === "admin"))
      .catch(() => setEhAdmin(false));
  }, []);

  return (
    <MolduraCrm titulo="Configurações do CRM" largura="max-w-5xl">
      <div role="tablist" className="mb-6 inline-flex rounded-full border border-pipe-border bg-white p-1 text-sm">
        {(
          [
            ["funis", "Funis e etapas"],
            ["campos", "Campos personalizados"],
          ] as const
        ).map(([v, r]) => (
          <button
            key={v}
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className={`rounded-full px-4 py-1.5 ${aba === v ? "bg-pipe-ink text-white" : "text-pipe-ink-soft hover:text-pipe-ink"}`}
          >
            {r}
          </button>
        ))}
      </div>
      {ehAdmin === false && (
        <div className="mb-6">
          <Aviso>Só administradores da organização podem alterar estas configurações. Você pode consultar.</Aviso>
        </div>
      )}
      {aba === "funis" ? <ConfigFunis podeEditar={ehAdmin === true} /> : <ConfigCampos podeEditar={ehAdmin === true} />}
    </MolduraCrm>
  );
}

function ConfigFunis({ podeEditar }: { podeEditar: boolean }) {
  const [funis, setFunis] = useState<Funil[] | null>(null);
  const [erro, setErro] = useState("");
  const [novoFunil, setNovoFunil] = useState("");
  const [novaEtapa, setNovaEtapa] = useState<Record<string, string>>({});
  const [apagando, setApagando] = useState<{ etapa: Etapa; funil: Funil } | null>(null);
  const [destino, setDestino] = useState("");

  const carregar = useCallback(async () => {
    try {
      const d = await chamar("/api/crm/funis", "GET");
      setFunis(d.funis);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    }
  }, []);
  useEffect(() => {
    // Carrega fora do ciclo do efeito (evita renderização em cascata).
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  async function acao(fn: () => Promise<unknown>) {
    setErro("");
    try {
      await fn();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    }
  }

  async function mover(funil: Funil, i: number, delta: number) {
    const ids = funil.etapas.map((e) => e.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await acao(() => chamar("/api/crm/estagios", "PATCH", { pipeline_id: funil.id, ordem: ids }));
  }

  return (
    <div className="space-y-6">
      {erro && <Aviso>{erro}</Aviso>}
      {!funis && <div className="h-40 animate-pulse rounded-2xl bg-white/70" />}
      {funis?.map((f, fi) => (
        <section key={f.id} className="rounded-2xl border border-pipe-border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pipe-border px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {podeEditar ? (
                <input
                  defaultValue={f.nome}
                  aria-label="Nome do funil"
                  onBlur={(e) => e.target.value.trim() && e.target.value !== f.nome && void acao(() => chamar("/api/crm/funis", "PATCH", { id: f.id, nome: e.target.value }))}
                  className="min-w-0 rounded-md border border-transparent px-1.5 py-1 text-base font-medium text-pipe-ink hover:border-pipe-border focus:border-pipe-blue focus:outline-none"
                />
              ) : (
                <h2 className="text-base font-medium text-pipe-ink">{f.nome}</h2>
              )}
              {fi === 0 && <span className="rounded-full bg-pipe-bg px-2 py-0.5 text-[11px] text-pipe-ink-soft">Padrão</span>}
              <span className="text-xs text-pipe-muted">{f.negocios} {f.negocios === 1 ? "negócio" : "negócios"}</span>
            </div>
            {podeEditar && funis.length > 1 && (
              <button
                onClick={() => void acao(() => chamar(`/api/crm/funis?id=${f.id}`, "DELETE"))}
                className="text-sm text-red-700 hover:underline disabled:opacity-40"
                disabled={f.negocios > 0}
                title={f.negocios > 0 ? "Mova ou exclua os negócios antes" : undefined}
              >
                Apagar funil
              </button>
            )}
          </div>
          <ol className="divide-y divide-pipe-border/60">
            {f.etapas.map((e, i) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                {podeEditar && (
                  <span className="flex flex-col">
                    <button aria-label="Subir etapa" disabled={i === 0} onClick={() => void mover(f, i, -1)} className="text-xs leading-none text-pipe-muted hover:text-pipe-ink disabled:opacity-30">
                      ▲
                    </button>
                    <button aria-label="Descer etapa" disabled={i === f.etapas.length - 1} onClick={() => void mover(f, i, 1)} className="text-xs leading-none text-pipe-muted hover:text-pipe-ink disabled:opacity-30">
                      ▼
                    </button>
                  </span>
                )}
                {podeEditar ? (
                  <select
                    aria-label="Cor da etapa"
                    value={e.cor}
                    onChange={(ev) => void acao(() => chamar("/api/crm/estagios", "PATCH", { stage_id: e.id, cor: ev.target.value }))}
                    className="h-6 w-6 cursor-pointer appearance-none rounded-full border border-pipe-border text-transparent"
                    style={{ background: e.cor }}
                  >
                    {[...new Set([e.cor, ...CORES])].map((c) => (
                      <option key={c} value={c} style={{ background: c }}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="h-3 w-3 rounded-full" style={{ background: e.cor }} />
                )}
                {podeEditar ? (
                  <input
                    defaultValue={e.nome}
                    aria-label="Nome da etapa"
                    onBlur={(ev) => ev.target.value.trim() && ev.target.value !== e.nome && void acao(() => chamar("/api/crm/estagios", "PATCH", { stage_id: e.id, nome: ev.target.value }))}
                    className="min-w-[160px] flex-1 rounded-md border border-transparent px-1.5 py-1 text-sm text-pipe-ink hover:border-pipe-border focus:border-pipe-blue focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm text-pipe-ink">{e.nome}</span>
                )}
                <label className="flex items-center gap-1.5 text-xs text-pipe-muted">
                  Chance
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!podeEditar}
                    defaultValue={e.probabilidade ?? ""}
                    onBlur={(ev) =>
                      ev.target.value !== "" &&
                      Number(ev.target.value) !== e.probabilidade &&
                      void acao(() => chamar("/api/crm/estagios", "PATCH", { stage_id: e.id, probabilidade: Number(ev.target.value) }))
                    }
                    className="w-16 rounded-md border border-pipe-border px-2 py-1 text-right text-sm text-pipe-ink disabled:bg-pipe-bg"
                  />
                  %
                </label>
                <span className="w-20 text-right text-xs text-pipe-muted">{e.negocios} {e.negocios === 1 ? "negócio" : "negócios"}</span>
                {podeEditar && (
                  <button
                    onClick={() => {
                      if (e.negocios > 0) {
                        setDestino(f.etapas.find((x) => x.id !== e.id)?.id ?? "");
                        setApagando({ etapa: e, funil: f });
                      } else void acao(() => chamar(`/api/crm/estagios?id=${e.id}`, "DELETE"));
                    }}
                    aria-label={`Apagar etapa ${e.nome}`}
                    className="text-sm text-pipe-muted hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ol>
          {podeEditar && (
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                const nome = (novaEtapa[f.id] ?? "").trim();
                if (!nome) return;
                void acao(() => chamar("/api/crm/estagios", "POST", { pipeline_id: f.id, nome })).then(() => setNovaEtapa({ ...novaEtapa, [f.id]: "" }));
              }}
              className="flex gap-2 border-t border-pipe-border px-5 py-3"
            >
              <input
                value={novaEtapa[f.id] ?? ""}
                onChange={(ev) => setNovaEtapa({ ...novaEtapa, [f.id]: ev.target.value })}
                placeholder="Nova etapa"
                aria-label="Nome da nova etapa"
                className={`${classeCampo} max-w-xs`}
              />
              <BotaoSecundario type="submit">Adicionar</BotaoSecundario>
            </form>
          )}
        </section>
      ))}

      {podeEditar && funis && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!novoFunil.trim()) return;
            void acao(() => chamar("/api/crm/funis", "POST", { nome: novoFunil })).then(() => setNovoFunil(""));
          }}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-pipe-border p-5"
        >
          <div className="min-w-[240px] flex-1">
            <Rotulo htmlFor="novo-funil">Novo funil</Rotulo>
            <input id="novo-funil" value={novoFunil} onChange={(e) => setNovoFunil(e.target.value)} placeholder="Ex.: Pós-venda, Parcerias, Renovação" className={classeCampo} />
          </div>
          <BotaoPrimario type="submit" disabled={!novoFunil.trim()}>
            Criar funil
          </BotaoPrimario>
          <p className="w-full text-xs text-pipe-muted">O funil novo começa com seis etapas que você pode renomear, reordenar ou apagar.</p>
        </form>
      )}

      <Janela aberta={!!apagando} titulo="Apagar etapa com negócios" aoFechar={() => setApagando(null)} largura="max-w-md">
        {apagando && (
          <>
            <p className="text-sm text-pipe-ink-soft">
              {apagando.etapa.negocios} negócio(s) estão em “{apagando.etapa.nome}”. Para onde movê-los?
            </p>
            <select value={destino} onChange={(e) => setDestino(e.target.value)} className={`${classeCampo} mt-4`}>
              {apagando.funil.etapas
                .filter((x) => x.id !== apagando.etapa.id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
            </select>
            <div className="mt-6 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setApagando(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario
                onClick={() => {
                  const alvo = apagando;
                  setApagando(null);
                  void acao(() => chamar(`/api/crm/estagios?id=${alvo.etapa.id}&mover_para=${destino}`, "DELETE"));
                }}
              >
                Mover e apagar
              </BotaoPrimario>
            </div>
          </>
        )}
      </Janela>
    </div>
  );
}

function ConfigCampos({ podeEditar }: { podeEditar: boolean }) {
  const [campos, setCampos] = useState<CampoPersonalizado[] | null>(null);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState<{ entidade: EntidadeCampo; nome: string; tipo: TipoCampo; opcoes: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const d = await chamar("/api/crm/campos", "GET");
      setCampos(d.campos);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    }
  }, []);
  useEffect(() => {
    // Carrega fora do ciclo do efeito (evita renderização em cascata).
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  async function acao(fn: () => Promise<unknown>) {
    setErro("");
    try {
      await fn();
      await carregar();
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      return false;
    }
  }

  return (
    <div className="space-y-6">
      {erro && <Aviso>{erro}</Aviso>}
      <p className="max-w-2xl text-sm text-pipe-muted">
        Crie campos próprios da sua operação, como “Número de funcionários”, “Origem do lead” ou “Data da renovação”. Eles
        aparecem nos formulários e nas fichas de cada cadastro.
      </p>
      {ENTIDADES_CAMPO.map((ent) => {
        const lista = (campos ?? []).filter((c) => c.entidade === ent.valor);
        return (
          <section key={ent.valor} className="rounded-2xl border border-pipe-border bg-white">
            <div className="flex items-center justify-between border-b border-pipe-border px-5 py-3">
              <h2 className="text-sm font-medium text-pipe-ink">{ent.rotulo}</h2>
              {podeEditar && (
                <button onClick={() => setNovo({ entidade: ent.valor, nome: "", tipo: "texto", opcoes: "" })} className="text-sm text-pipe-blue hover:underline">
                  + Campo
                </button>
              )}
            </div>
            {lista.length === 0 ? (
              <p className="px-5 py-5 text-sm text-pipe-muted">Nenhum campo personalizado.</p>
            ) : (
              <ul className="divide-y divide-pipe-border/60">
                {lista.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                    {podeEditar ? (
                      <input
                        defaultValue={c.nome}
                        aria-label="Nome do campo"
                        onBlur={(e) => e.target.value.trim() && e.target.value !== c.nome && void acao(() => chamar("/api/crm/campos", "PATCH", { id: c.id, nome: e.target.value }))}
                        className="min-w-[160px] flex-1 rounded-md border border-transparent px-1.5 py-1 text-sm text-pipe-ink hover:border-pipe-border focus:border-pipe-blue focus:outline-none"
                      />
                    ) : (
                      <span className="flex-1 text-sm text-pipe-ink">{c.nome}</span>
                    )}
                    <span className="rounded-full bg-pipe-bg px-2 py-0.5 text-xs text-pipe-ink-soft">
                      {TIPOS_CAMPO.find((t) => t.valor === c.tipo)?.rotulo}
                    </span>
                    {c.tipo === "opcao" && <span className="max-w-[260px] truncate text-xs text-pipe-muted">{c.opcoes.join(", ")}</span>}
                    {podeEditar && (
                      <button
                        onClick={() => void acao(() => chamar(`/api/crm/campos?id=${c.id}`, "DELETE"))}
                        aria-label={`Apagar campo ${c.nome}`}
                        className="text-sm text-pipe-muted hover:text-red-700"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <Janela aberta={!!novo} titulo="Novo campo" aoFechar={() => setNovo(null)} largura="max-w-md">
        {novo && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void acao(() =>
                chamar("/api/crm/campos", "POST", {
                  entidade: novo.entidade,
                  nome: novo.nome,
                  tipo: novo.tipo,
                  opcoes: novo.tipo === "opcao" ? novo.opcoes.split("\n") : undefined,
                })
              ).then((ok) => ok && setNovo(null));
            }}
            className="space-y-4"
          >
            <div>
              <Rotulo htmlFor="c-nome">Nome do campo</Rotulo>
              <input id="c-nome" required autoFocus value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className={classeCampo} />
            </div>
            <div>
              <Rotulo htmlFor="c-tipo">Tipo</Rotulo>
              <select id="c-tipo" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as TipoCampo })} className={classeCampo}>
                {TIPOS_CAMPO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </div>
            {novo.tipo === "opcao" && (
              <div>
                <Rotulo htmlFor="c-opcoes">Opções (uma por linha)</Rotulo>
                <textarea id="c-opcoes" rows={4} value={novo.opcoes} onChange={(e) => setNovo({ ...novo, opcoes: e.target.value })} className={classeCampo} />
              </div>
            )}
            {erro && <Aviso>{erro}</Aviso>}
            <div className="flex justify-end gap-2">
              <BotaoSecundario type="button" onClick={() => setNovo(null)}>
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario type="submit" disabled={!novo.nome.trim()}>
                Criar campo
              </BotaoPrimario>
            </div>
          </form>
        )}
      </Janela>
    </div>
  );
}
