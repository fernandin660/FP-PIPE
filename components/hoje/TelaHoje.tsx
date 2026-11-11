"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { criarClienteSupabase } from "../../lib/supabase/client";
import Sidebar from "../Sidebar";
import { AbasCrm, AlternarVisao } from "../crm/MolduraCrm";
import ModalPerfil, { type PerfilVendedor } from "../ModalPerfil";
import { IconeCalendario, IconeEmail, IconeEnviar, IconeEquipe, IconeEscrever, IconeTelefone } from "../Icones";

type Atividade = {
  id: string;
  tipo_evento: string;
  tipo_atividade: string;
  titulo: string;
  observacao: string;
  data_hora_atividade: string | null;
  atrasada: boolean;
  company_id: string;
  empresa: string;
  stage_nome: string | null;
  responsavel_nome: string | null;
  autor_nome: string | null;
};

const FUSO = "America/Sao_Paulo";

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

const FILTROS: { chave: string; rotulo: string; tipos: string[] | null }[] = [
  { chave: "todas", rotulo: "Todas", tipos: null },
  { chave: "ligacoes", rotulo: "Ligações", tipos: ["telefone", "ligacao"] },
  { chave: "emails", rotulo: "E-mails", tipos: ["email"] },
  { chave: "mensagens", rotulo: "WhatsApp e LinkedIn", tipos: ["whatsapp", "linkedin"] },
  { chave: "reunioes", rotulo: "Reuniões", tipos: ["reuniao"] },
  { chave: "tarefas", rotulo: "Tarefas", tipos: ["tarefa", "observacao"] },
];

/** Dia no fuso de Brasília, no formato AAAA-MM-DD (ordenável). */
function diaBrasilia(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
}

function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return diaBrasilia(d);
}

function rotuloDia(dia: string, hoje: string): string {
  if (dia === somarDias(hoje, 1)) return "Amanhã";
  const d = new Date(`${dia}T12:00:00-03:00`);
  const txt = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" }).format(d);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function hora(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short" }).format(new Date(iso)).replace(".", "");
}

function IconeTipo({ tipo }: { tipo: string }) {
  const cls = "w-4 h-4";
  if (tipo === "email") return <IconeEmail className={cls} />;
  if (tipo === "telefone" || tipo === "ligacao") return <IconeTelefone className={cls} />;
  if (tipo === "whatsapp" || tipo === "linkedin") return <IconeEnviar className={cls} />;
  if (tipo === "reuniao") return <IconeEquipe className={cls} />;
  return <IconeEscrever className={cls} />;
}

type Grupo = { chave: string; titulo: string; tom: "alerta" | "normal" | "suave"; itens: Atividade[] };

export default function TelaHoje() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [desfazer, setDesfazer] = useState<Atividade | null>(null);
  const [hoje, setHoje] = useState(() => diaBrasilia(new Date()));

  const carregarAtividades = useCallback(async () => {
    try {
      const ate = somarDias(diaBrasilia(new Date()), 7);
      const res = await fetch(`/api/crm/atividades?ate=${ate}`, { cache: "no-store" });
      const dados = await res.json().catch(() => null);
      if (!res.ok) throw new Error(dados?.erro ?? "Não conseguimos carregar as atividades.");
      setAtividades((dados?.pendentes ?? []) as Atividade[]);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não conseguimos carregar as atividades.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    async function iniciar() {
      const supabase = criarClienteSupabase();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/hoje");
        return;
      }
      const [{ data: dadosPerfil }, { data: dadosCreditos }] = await Promise.all([
        supabase
          .from("perfil")
          .select("nome_empresa, area_atuacao, departamento_uso, produtos_servicos, site, foto_url, anexos, nichos")
          .eq("usuario_id", user.id)
          .maybeSingle(),
        supabase.from("creditos").select("saldo").eq("usuario_id", user.id).maybeSingle(),
      ]);
      setPerfil((dadosPerfil as PerfilVendedor) ?? null);
      setSaldoCreditos(dadosCreditos?.saldo ?? null);
      await carregarAtividades();
    }
    void iniciar();
  }, [router, carregarAtividades]);

  // Vira o dia sozinho se a tela ficar aberta depois da meia-noite.
  useEffect(() => {
    const id = setInterval(() => setHoje(diaBrasilia(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  const filtradas = useMemo(() => {
    const tipos = FILTROS.find((f) => f.chave === filtro)?.tipos;
    return tipos ? atividades.filter((a) => tipos.includes(a.tipo_atividade)) : atividades;
  }, [atividades, filtro]);

  const grupos = useMemo<Grupo[]>(() => {
    const atrasadas: Atividade[] = [];
    const deHoje: Atividade[] = [];
    const semData: Atividade[] = [];
    const porDia = new Map<string, Atividade[]>();
    for (const a of filtradas) {
      if (!a.data_hora_atividade) {
        semData.push(a);
        continue;
      }
      const dia = diaBrasilia(new Date(a.data_hora_atividade));
      if (dia < hoje) atrasadas.push(a);
      else if (dia === hoje) deHoje.push(a);
      else porDia.set(dia, [...(porDia.get(dia) ?? []), a]);
    }
    const lista: Grupo[] = [];
    if (atrasadas.length) lista.push({ chave: "atrasadas", titulo: "Atrasadas", tom: "alerta", itens: atrasadas });
    lista.push({ chave: "hoje", titulo: "Hoje", tom: "normal", itens: deHoje });
    for (const [dia, itens] of [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lista.push({ chave: dia, titulo: rotuloDia(dia, hoje), tom: "suave", itens });
    }
    if (semData.length) lista.push({ chave: "sem-data", titulo: "Tarefas sem data", tom: "suave", itens: semData });
    return lista;
  }, [filtradas, hoje]);

  const contagem = useMemo(() => {
    let atrasadas = 0;
    let deHoje = 0;
    for (const a of atividades) {
      if (!a.data_hora_atividade) continue;
      const dia = diaBrasilia(new Date(a.data_hora_atividade));
      if (dia < hoje) atrasadas++;
      else if (dia === hoje) deHoje++;
    }
    return { atrasadas, deHoje, total: atividades.length };
  }, [atividades, hoje]);

  async function editar(id: string, corpo: Record<string, unknown>) {
    const res = await fetch("/api/crm/atividades", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atividade_id: id, ...corpo }),
    });
    const dados = await res.json().catch(() => null);
    if (!res.ok) throw new Error(dados?.erro ?? "Não foi possível salvar.");
  }

  async function concluir(a: Atividade) {
    setOcupadoId(a.id);
    try {
      await editar(a.id, { concluida: true });
      setAtividades((atual) => atual.filter((x) => x.id !== a.id));
      setDesfazer(a);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setOcupadoId(null);
    }
  }

  async function desfazerConclusao() {
    const a = desfazer;
    if (!a) return;
    setDesfazer(null);
    try {
      await editar(a.id, { concluida: false });
      await carregarAtividades();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível desfazer.");
    }
  }

  async function adiar(a: Atividade) {
    setOcupadoId(a.id);
    try {
      // Mantém o horário e empurra para o dia seguinte (a partir de hoje, se estava atrasada).
      const base = a.data_hora_atividade ? new Date(a.data_hora_atividade) : new Date();
      const agora = Date.now();
      do base.setUTCDate(base.getUTCDate() + 1);
      while (base.getTime() < agora);
      await editar(a.id, { data_hora_atividade: base.toISOString() });
      await carregarAtividades();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível adiar.");
    } finally {
      setOcupadoId(null);
    }
  }

  useEffect(() => {
    if (!desfazer) return;
    const id = setTimeout(() => setDesfazer(null), 6000);
    return () => clearTimeout(id);
  }, [desfazer]);

  const dataTitulo = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" }).format(new Date(`${hoje}T12:00:00-03:00`));

  return (
    <>
      <Sidebar perfil={perfil} saldoCreditos={saldoCreditos} aoAbrirPerfil={() => setModalPerfilAberto(true)} />
      <ModalPerfil
        key={`perfil-hoje-${modalPerfilAberto}`}
        aberto={modalPerfilAberto}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={setPerfil}
      />

      <main className="min-h-screen bg-pipe-bg px-5 pb-10 pt-8 sm:px-8 lg:pl-72 lg:pr-10">
        <div className="mx-auto max-w-4xl">
          <AbasCrm />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-pipe-blue">{dataTitulo}</p>
              <h1 className="mt-3 text-4xl font-medium tracking-[-0.03em] text-pipe-ink md:text-5xl">O que fazer hoje</h1>
            </div>
            <AlternarVisao
              opcoes={[
                { href: "/hoje", rotulo: "Lista", ativa: true },
                { href: "/crm/calendario", rotulo: "Calendário", ativa: false },
              ]}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <span className={`rounded-full border px-3 py-1.5 ${contagem.atrasadas ? "border-red-600/30 bg-red-50 text-red-700" : "border-pipe-border text-pipe-muted"}`}>
              {contagem.atrasadas} atrasada{contagem.atrasadas === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-pipe-border bg-white px-3 py-1.5 text-pipe-ink">
              {contagem.deHoje} para hoje
            </span>
            <span className="rounded-full border border-pipe-border px-3 py-1.5 text-pipe-muted">
              {contagem.total} nos próximos 7 dias
            </span>
          </div>

          <div role="tablist" aria-label="Filtrar por tipo" className="mt-8 flex gap-1 overflow-x-auto border-b border-pipe-border">
            {FILTROS.map((f) => (
              <button
                key={f.chave}
                role="tab"
                aria-selected={filtro === f.chave}
                onClick={() => setFiltro(f.chave)}
                className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                  filtro === f.chave ? "border-pipe-ink font-medium text-pipe-ink" : "border-transparent text-pipe-muted hover:text-pipe-ink"
                }`}
              >
                {f.rotulo}
              </button>
            ))}
          </div>

          {erro && (
            <p role="alert" className="mt-6 border-l-2 border-red-600 pl-3 text-sm text-red-700">
              {erro}
            </p>
          )}

          {carregando ? (
            <div className="mt-10 space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-xl bg-white/70" />
              ))}
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              {grupos.map((g) => (
                <section key={g.chave} aria-labelledby={`grupo-${g.chave}`}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2
                      id={`grupo-${g.chave}`}
                      className={`text-sm font-medium ${g.tom === "alerta" ? "text-red-700" : g.tom === "normal" ? "text-pipe-ink" : "text-pipe-muted"}`}
                    >
                      {g.titulo}
                    </h2>
                    <span className="text-xs tabular-nums text-pipe-muted">{g.itens.length}</span>
                  </div>

                  {g.itens.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-pipe-border px-5 py-8 text-center text-sm text-pipe-muted">
                      {g.chave === "hoje" ? (
                        <>
                          Nada marcado para hoje.{" "}
                          <Link href="/crm" className="text-pipe-blue underline-offset-4 hover:underline">
                            Abrir o funil
                          </Link>
                        </>
                      ) : (
                        "Nada aqui."
                      )}
                    </div>
                  ) : (
                    <ul className="divide-y divide-pipe-border overflow-hidden rounded-xl border border-pipe-border bg-white">
                      {g.itens.map((a) => (
                        <li key={a.id} className="group flex items-start gap-4 px-4 py-4 sm:px-5">
                          <button
                            onClick={() => void concluir(a)}
                            disabled={ocupadoId === a.id}
                            aria-label={`Concluir: ${a.titulo}`}
                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-pipe-border text-transparent transition hover:border-pipe-blue hover:text-pipe-blue disabled:opacity-50"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="m3 8.5 3.2 3L13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-pipe-bg px-2 py-0.5 text-xs text-pipe-ink-soft">
                                <IconeTipo tipo={a.tipo_atividade} />
                                {ROTULO_TIPO[a.tipo_atividade] ?? "Atividade"}
                              </span>
                              {a.tipo_evento === "atividade_programada" && (
                                <span className="text-xs text-pipe-muted">Cadência</span>
                              )}
                            </div>
                            <p className="mt-1.5 text-[15px] font-medium leading-snug text-pipe-ink">{a.titulo}</p>
                            <p className="mt-1 truncate text-sm text-pipe-muted">
                              <Link
                                href={`/crm?empresa=${encodeURIComponent(a.company_id)}`}
                                className="text-pipe-ink-soft underline-offset-4 hover:text-pipe-blue hover:underline"
                              >
                                {a.empresa}
                              </Link>
                              {a.stage_nome && <> · {a.stage_nome.charAt(0) + a.stage_nome.slice(1).toLowerCase()}</>}
                              {a.responsavel_nome && <> · {a.responsavel_nome}</>}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span
                              className={`text-sm tabular-nums ${
                                a.data_hora_atividade && new Date(a.data_hora_atividade).getTime() < Date.now()
                                  ? "font-medium text-red-700"
                                  : "text-pipe-ink-soft"
                              }`}
                            >
                              {g.chave === "atrasadas" ? dataCurta(a.data_hora_atividade) : hora(a.data_hora_atividade)}
                            </span>
                            <button
                              onClick={() => void adiar(a)}
                              disabled={ocupadoId === a.id}
                              className="inline-flex items-center gap-1 rounded-full border border-pipe-border px-2.5 py-1 text-xs text-pipe-ink-soft transition hover:border-pipe-ink/40 hover:text-pipe-ink disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                            >
                              <IconeCalendario className="h-3.5 w-3.5" />
                              Adiar 1 dia
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {desfazer && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full bg-pipe-ink px-5 py-3 text-sm text-white shadow-lg">
          <span className="max-w-[46vw] truncate">Concluída: {desfazer.titulo}</span>
          <button onClick={() => void desfazerConclusao()} className="font-medium text-[#9fb0ff] hover:text-white">
            Desfazer
          </button>
        </div>
      )}
    </>
  );
}
