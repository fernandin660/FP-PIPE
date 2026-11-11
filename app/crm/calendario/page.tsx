"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import MolduraCrm, { AlternarVisao } from "../../../components/crm/MolduraCrm";
import { Aviso, BotaoSecundario, Janela } from "../../../components/crm/ui";

type Atividade = {
  id: string;
  tipo_evento: string;
  tipo_atividade: string;
  titulo: string;
  observacao: string;
  data_hora_atividade: string | null;
  concluida: boolean;
  atrasada: boolean;
  company_id: string;
  empresa: string;
  stage_nome: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  autor_nome: string | null;
};

const FUSO = "America/Sao_Paulo";
const HORA_INICIO = 7;
const HORA_FIM = 21; // exclusivo
const ALTURA_HORA = 52;

const ROTULO_TIPO: Record<string, string> = {
  email: "E-mail",
  telefone: "Ligação",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  reuniao: "Reunião",
  tarefa: "Tarefa",
  observacao: "Nota",
};
const COR_TIPO: Record<string, string> = {
  reuniao: "#2442e5",
  telefone: "#0f766e",
  ligacao: "#0f766e",
  email: "#7c3aed",
  whatsapp: "#15803d",
  linkedin: "#0369a1",
  tarefa: "#b45309",
};

/** Data/hora no fuso de Brasília. */
function partes(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour), minuto: Number(p.minute) };
}
function hojeBr(): string {
  return partes(new Date().toISOString()).dia;
}
function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00Z`).getUTCDay(); // 0 = domingo
}
/** Segunda-feira da semana do dia. */
function inicioSemana(dia: string): string {
  const dow = diaDaSemana(dia);
  return somarDias(dia, dow === 0 ? -6 : 1 - dow);
}
function isoBrasilia(dia: string, hora: number, minuto: number): string {
  const hh = String(hora).padStart(2, "0");
  const mm = String(minuto).padStart(2, "0");
  return new Date(`${dia}T${hh}:${mm}:00-03:00`).toISOString();
}
function fmt(dia: string, opcoes: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...opcoes }).format(new Date(`${dia}T12:00:00Z`)).replace(".", "");
}
function horaTexto(iso: string | null): string {
  if (!iso) return "";
  const p = partes(iso);
  return `${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
}

export default function CalendarioAtividades() {
  const [modo, setModo] = useState<"semana" | "mes">("semana");
  const [referencia, setReferencia] = useState(hojeBr);
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);
  const [erro, setErro] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [mostrarConcluidas, setMostrarConcluidas] = useState(true);
  const [aberta, setAberta] = useState<Atividade | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const hoje = hojeBr();

  const intervalo = useMemo(() => {
    if (modo === "semana") {
      const de = inicioSemana(referencia);
      return { de, ate: somarDias(de, 6) };
    }
    const primeiro = `${referencia.slice(0, 7)}-01`;
    const de = inicioSemana(primeiro);
    return { de, ate: somarDias(de, 41) };
  }, [modo, referencia]);

  const carregar = useCallback(async () => {
    try {
      const q = new URLSearchParams({ todas: "1", de: intervalo.de, ate: intervalo.ate });
      const res = await fetch(`/api/crm/atividades?${q}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.erro ?? "Não foi possível carregar as atividades.");
      setAtividades(d.pendentes ?? []);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar as atividades.");
    }
  }, [intervalo]);

  useEffect(() => {
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, [carregar]);

  const responsaveis = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of atividades ?? []) if (a.responsavel_id) m.set(a.responsavel_id, a.responsavel_nome ?? "Sem nome");
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [atividades]);

  const visiveis = useMemo(
    () =>
      (atividades ?? []).filter(
        (a) => a.data_hora_atividade && (mostrarConcluidas || !a.concluida) && (!responsavel || a.responsavel_id === responsavel)
      ),
    [atividades, mostrarConcluidas, responsavel]
  );

  const porDia = useMemo(() => {
    const m = new Map<string, Atividade[]>();
    for (const a of visiveis) {
      const d = partes(a.data_hora_atividade!).dia;
      m.set(d, [...(m.get(d) ?? []), a]);
    }
    for (const lista of m.values()) lista.sort((x, y) => x.data_hora_atividade!.localeCompare(y.data_hora_atividade!));
    return m;
  }, [visiveis]);

  async function salvar(id: string, mudancas: Record<string, unknown>) {
    // Atualização otimista; recarrega para refletir o servidor.
    setAtividades((lista) =>
      (lista ?? []).map((a) =>
        a.id === id
          ? {
              ...a,
              ...(typeof mudancas.data_hora_atividade === "string" ? { data_hora_atividade: mudancas.data_hora_atividade } : {}),
              ...(typeof mudancas.concluida === "boolean" ? { concluida: mudancas.concluida } : {}),
            }
          : a
      )
    );
    const res = await fetch("/api/crm/atividades", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atividade_id: id, ...mudancas }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setErro(d?.erro ?? "Não foi possível salvar a atividade.");
    }
    void carregar();
  }

  function soltar(dia: string, hora: number | null, id: string) {
    const a = atividades?.find((x) => x.id === id);
    if (!a?.data_hora_atividade) return;
    const atual = partes(a.data_hora_atividade);
    const novaHora = hora ?? atual.hora;
    const novoMinuto = hora === null ? atual.minuto : 0;
    if (atual.dia === dia && atual.hora === novaHora && atual.minuto === novoMinuto) return;
    void salvar(id, { data_hora_atividade: isoBrasilia(dia, novaHora, novoMinuto) });
  }

  const passo = (d: number) =>
    setReferencia((r) => {
      if (modo === "semana") return somarDias(r, 7 * d);
      const [a, m] = r.split("-").map(Number);
      const data = new Date(Date.UTC(a, m - 1 + d, 1));
      return data.toISOString().slice(0, 10);
    });

  const titulo =
    modo === "semana"
      ? `${fmt(intervalo.de, { day: "numeric", month: "short" })} – ${fmt(intervalo.ate, { day: "numeric", month: "short", year: "numeric" })}`
      : fmt(`${referencia.slice(0, 7)}-15`, { month: "long", year: "numeric" });

  const diasSemana = Array.from({ length: 7 }, (_, i) => somarDias(intervalo.de, i));

  return (
    <MolduraCrm
      titulo="Atividades"
      largura="max-w-[1400px]"
      acoes={
        <AlternarVisao
          opcoes={[
            { href: "/hoje", rotulo: "Lista", ativa: false },
            { href: "/crm/calendario", rotulo: "Calendário", ativa: true },
          ]}
        />
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BotaoSecundario onClick={() => setReferencia(hoje)} className="!py-2">
          Hoje
        </BotaoSecundario>
        <div className="flex">
          <button onClick={() => passo(-1)} aria-label="Anterior" className="h-9 w-9 rounded-full text-pipe-muted hover:bg-pipe-dark hover:text-pipe-ink">
            ‹
          </button>
          <button onClick={() => passo(1)} aria-label="Próximo" className="h-9 w-9 rounded-full text-pipe-muted hover:bg-pipe-dark hover:text-pipe-ink">
            ›
          </button>
        </div>
        <h2 className="mr-auto text-lg font-medium tracking-tight text-pipe-ink">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
        <select
          aria-label="Responsável"
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          className="rounded-full border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
        >
          <option value="">Toda a equipe</option>
          {responsaveis.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-pipe-muted">
          <input type="checkbox" className="accent-[#2442e5]" checked={mostrarConcluidas} onChange={(e) => setMostrarConcluidas(e.target.checked)} />
          Concluídas
        </label>
        <div role="group" aria-label="Período" className="inline-flex rounded-full border border-pipe-border bg-white p-0.5 text-sm">
          {(["semana", "mes"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={modo === m}
              onClick={() => setModo(m)}
              className={`rounded-full px-3.5 py-1.5 ${modo === m ? "bg-pipe-ink font-medium text-white" : "text-pipe-muted hover:text-pipe-ink"}`}
            >
              {m === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div className="mb-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}
      <p className="mb-3 text-xs text-pipe-muted">Arraste uma atividade para outro dia ou horário para reagendar. Horários de Brasília.</p>

      {modo === "semana" ? (
        <div className="overflow-x-auto rounded-2xl border border-pipe-border bg-pipe-card">
          <div className="grid min-w-[900px]" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
            {/* Cabeçalho */}
            <div className="border-b border-pipe-border" />
            {diasSemana.map((d) => (
              <div key={d} className={`border-b border-l border-pipe-border px-2 py-2 text-center ${d === hoje ? "bg-[#2442e5]/[0.06]" : ""}`}>
                <p className="text-[11px] uppercase tracking-wider text-pipe-muted">{fmt(d, { weekday: "short" })}</p>
                <p className={`text-lg tabular-nums ${d === hoje ? "font-semibold text-pipe-blue" : "text-pipe-ink"}`}>{Number(d.slice(8))}</p>
              </div>
            ))}
            {/* Sem horário útil (fora de 7h–21h) */}
            <div className="border-b border-pipe-border px-1 py-1.5 text-right text-[10px] leading-tight text-pipe-muted">fora do horário</div>
            {diasSemana.map((d) => {
              const fora = (porDia.get(d) ?? []).filter((a) => {
                const h = partes(a.data_hora_atividade!).hora;
                return h < HORA_INICIO || h >= HORA_FIM;
              });
              return (
                <div key={d} className="min-h-[34px] space-y-1 border-b border-l border-pipe-border p-1">
                  {fora.map((a) => (
                    <Cartao key={a.id} a={a} compacto aoAbrir={setAberta} aoArrastar={setArrastando} />
                  ))}
                </div>
              );
            })}
            {/* Grade de horas */}
            <div>
              {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
                <div key={i} style={{ height: ALTURA_HORA }} className="pr-2 pt-1 text-right text-[11px] tabular-nums text-pipe-muted">
                  {String(HORA_INICIO + i).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {diasSemana.map((d) => {
              const doDia = (porDia.get(d) ?? []).filter((a) => {
                const h = partes(a.data_hora_atividade!).hora;
                return h >= HORA_INICIO && h < HORA_FIM;
              });
              // Atividades no mesmo horário ficam lado a lado.
              const porSlot = new Map<string, Atividade[]>();
              for (const a of doDia) {
                const p = partes(a.data_hora_atividade!);
                const k = `${p.hora}:${p.minuto}`;
                porSlot.set(k, [...(porSlot.get(k) ?? []), a]);
              }
              return (
                <div key={d} className={`relative border-l border-pipe-border ${d === hoje ? "bg-[#2442e5]/[0.03]" : ""}`}>
                  {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
                    <div
                      key={i}
                      style={{ height: ALTURA_HORA }}
                      className={`border-b border-pipe-border/60 ${arrastando ? "hover:bg-[#2442e5]/10" : ""}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("text/plain");
                        setArrastando(null);
                        if (id) soltar(d, HORA_INICIO + i, id);
                      }}
                    />
                  ))}
                  {[...porSlot.values()].flatMap((grupo) =>
                    grupo.map((a, idx) => {
                      const p = partes(a.data_hora_atividade!);
                      const topo = (p.hora - HORA_INICIO + p.minuto / 60) * ALTURA_HORA;
                      const largura = 100 / grupo.length;
                      return (
                        <div
                          key={a.id}
                          className="absolute px-0.5"
                          style={{ top: topo + 1, height: ALTURA_HORA - 4, left: `${idx * largura}%`, width: `${largura}%` }}
                        >
                          <Cartao a={a} aoAbrir={setAberta} aoArrastar={setArrastando} />
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-pipe-border bg-pipe-card">
          <div className="grid min-w-[760px] grid-cols-7">
            {diasSemana.map((d) => (
              <div key={d} className="border-b border-pipe-border px-2 py-2 text-[11px] uppercase tracking-wider text-pipe-muted">
                {fmt(d, { weekday: "short" })}
              </div>
            ))}
            {Array.from({ length: 42 }, (_, i) => somarDias(intervalo.de, i)).map((d, i) => {
              const doMes = d.slice(0, 7) === referencia.slice(0, 7);
              const lista = porDia.get(d) ?? [];
              return (
                <div
                  key={d}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    setArrastando(null);
                    if (id) soltar(d, null, id);
                  }}
                  className={`min-h-[118px] border-b border-pipe-border p-1.5 ${i % 7 ? "border-l" : ""} ${doMes ? "" : "bg-pipe-bg/70"} ${
                    arrastando ? "hover:bg-[#2442e5]/10" : ""
                  }`}
                >
                  <p className={`mb-1 text-xs tabular-nums ${d === hoje ? "inline-block rounded-full bg-pipe-blue px-1.5 font-semibold text-white" : doMes ? "text-pipe-ink" : "text-pipe-muted"}`}>
                    {Number(d.slice(8))}
                  </p>
                  <div className="space-y-1">
                    {lista.slice(0, 4).map((a) => (
                      <Cartao key={a.id} a={a} compacto aoAbrir={setAberta} aoArrastar={setArrastando} />
                    ))}
                    {lista.length > 4 && (
                      <button
                        onClick={() => {
                          setModo("semana");
                          setReferencia(d);
                        }}
                        className="px-1 text-[11px] text-pipe-muted hover:text-pipe-ink"
                      >
                        +{lista.length - 4} mais
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {atividades && visiveis.length === 0 && <p className="mt-4 text-center text-sm text-pipe-muted">Nenhuma atividade neste período.</p>}

      <Janela aberta={Boolean(aberta)} titulo={aberta?.titulo ?? ""} aoFechar={() => setAberta(null)}>
        {aberta && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[120px_1fr] gap-y-2">
              <dt className="text-pipe-muted">Tipo</dt>
              <dd className="text-pipe-ink">{ROTULO_TIPO[aberta.tipo_atividade] ?? aberta.tipo_atividade}</dd>
              <dt className="text-pipe-muted">Quando</dt>
              <dd className="text-pipe-ink">
                {aberta.data_hora_atividade &&
                  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
                    new Date(aberta.data_hora_atividade)
                  )}
              </dd>
              <dt className="text-pipe-muted">Negócio</dt>
              <dd>
                <Link href={`/crm?empresa=${aberta.company_id}`} className="text-pipe-blue hover:underline">
                  {aberta.empresa}
                </Link>
                {aberta.stage_nome && <span className="text-pipe-muted"> · {aberta.stage_nome}</span>}
              </dd>
              <dt className="text-pipe-muted">Responsável</dt>
              <dd className="text-pipe-ink">{aberta.responsavel_nome ?? "—"}</dd>
              {aberta.autor_nome && (
                <>
                  <dt className="text-pipe-muted">Criada por</dt>
                  <dd className="text-pipe-ink">{aberta.autor_nome}</dd>
                </>
              )}
            </dl>
            {aberta.observacao && <p className="whitespace-pre-wrap rounded-xl bg-pipe-bg p-3 text-pipe-ink-soft">{aberta.observacao}</p>}
            {aberta.data_hora_atividade && (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = new FormData(e.currentTarget).get("quando");
                  if (typeof v !== "string" || !v) return;
                  const [dia, hm] = v.split("T");
                  const [h, m] = hm.split(":").map(Number);
                  void salvar(aberta.id, { data_hora_atividade: isoBrasilia(dia, h, m) });
                  setAberta(null);
                }}
              >
                <label className="flex-1">
                  <span className="mb-1.5 block text-xs font-medium text-pipe-ink-soft">Reagendar para</span>
                  <input
                    name="quando"
                    type="datetime-local"
                    defaultValue={(() => {
                      const p = partes(aberta.data_hora_atividade);
                      return `${p.dia}T${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
                    })()}
                    className="w-full rounded-lg border border-pipe-border bg-white px-3 py-2 text-sm text-pipe-ink focus:border-pipe-blue focus:outline-none"
                  />
                </label>
                <BotaoSecundario type="submit">Reagendar</BotaoSecundario>
              </form>
            )}
            <div className="flex justify-end gap-2">
              <BotaoSecundario
                onClick={() => {
                  void salvar(aberta.id, { concluida: !aberta.concluida });
                  setAberta(null);
                }}
              >
                {aberta.concluida ? "Reabrir" : "Marcar como concluída"}
              </BotaoSecundario>
            </div>
          </div>
        )}
      </Janela>
    </MolduraCrm>
  );
}

function Cartao({
  a,
  compacto = false,
  aoAbrir,
  aoArrastar,
}: {
  a: Atividade;
  compacto?: boolean;
  aoAbrir: (a: Atividade) => void;
  aoArrastar: (id: string | null) => void;
}) {
  const cor = a.atrasada ? "#dc2626" : COR_TIPO[a.tipo_atividade] ?? "#5e5e66";
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", a.id);
        e.dataTransfer.effectAllowed = "move";
        aoArrastar(a.id);
      }}
      onDragEnd={() => aoArrastar(null)}
      onClick={() => aoAbrir(a)}
      title={`${a.titulo} · ${a.empresa}`}
      className={`block h-full w-full cursor-grab overflow-hidden rounded-md border-l-[3px] bg-white px-1.5 text-left shadow-[0_0_0_1px_#dedbd3] transition hover:shadow-[0_0_0_1px_#111114] active:cursor-grabbing ${
        compacto ? "py-0.5" : "py-1"
      } ${a.concluida ? "opacity-50" : ""}`}
      style={{ borderLeftColor: cor }}
    >
      <p className={`truncate text-[11px] font-medium text-pipe-ink ${a.concluida ? "line-through" : ""}`}>
        <span className="tabular-nums text-pipe-muted">{horaTexto(a.data_hora_atividade)}</span> {a.titulo}
      </p>
      {!compacto && <p className="truncate text-[11px] text-pipe-muted">{a.empresa}</p>}
    </button>
  );
}
