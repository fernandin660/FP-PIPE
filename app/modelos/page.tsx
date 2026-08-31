"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { criarClienteSupabase } from "../../lib/supabase/client";
import Sidebar from "../../components/Sidebar";
import ModalPerfil, {
  type PerfilVendedor,
} from "../../components/ModalPerfil";

const TIPOS_ATIVIDADE: Record<string, string> = {
  email: "✉️ E-mail",
  telefone: "📞 Telefone",
  whatsapp: "💬 WhatsApp",
  linkedin: "💼 LinkedIn",
  reuniao: "🤝 Reunião",
  tarefa: "📌 Tarefa",
  observacao: "📝 Observação",
};

type ModeloSalvo = {
  id: string;
  nome: string;
  canal: string;
  objetivo: string;
  produto: string | null;
  argumento: string | null;
  assunto: string | null;
  conteudo: string;
  criado_em: string;
};

const ICONE_CANAL: Record<string, string> = {
  email: "✉️ E-mail",
  linkedin: "💼 LinkedIn",
  whatsapp: "💬 WhatsApp",
  ligacao: "📞 Ligação",
};

type EtapaCadencia = {
  tipo_atividade: string;
  titulo: string;
  atraso_dias: number;
  script: string;
};

type CadenciaModelo = {
  id: string;
  nome: string;
  descricao: string;
  criado_em: string;
  etapas: EtapaCadencia[];
};

export default function PaginaModelos() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [modelos, setModelos] = useState<ModeloSalvo[]>([]);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const [aba, setAba] = useState<"modelos" | "cadencias">("modelos");
  const [cadencias, setCadencias] = useState<CadenciaModelo[]>([]);
  const [carregandoCadencias, setCarregandoCadencias] = useState(false);
  const [modalCadencia, setModalCadencia] = useState(false);
  const [salvandoCadencia, setSalvandoCadencia] = useState(false);
  const [erroCadencia, setErroCadencia] = useState("");
  const [formCadencia, setFormCadencia] = useState<{
    id: string | null;
    nome: string;
    descricao: string;
    etapas: EtapaCadencia[];
  }>({ id: null, nome: "", descricao: "", etapas: [] });

  useEffect(() => {
    async function carregar() {
      const supabase = criarClienteSupabase();
      if (!supabase) {
        setCarregando(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: dadosPerfil } = await supabase
        .from("perfil")
        .select(
          "nome_empresa, area_atuacao, departamento_uso, produtos_servicos, site, foto_url, anexos, nichos"
        )
        .eq("usuario_id", user.id)
        .maybeSingle();

      setPerfil((dadosPerfil as PerfilVendedor) ?? null);

      const { data: dadosCreditos } = await supabase
        .from("creditos")
        .select("saldo")
        .eq("usuario_id", user.id)
        .maybeSingle();

      setSaldoCreditos(dadosCreditos?.saldo ?? null);

      const { data: dadosModelos } = await supabase
        .from("modelos")
        .select(
          "id, nome, canal, objetivo, produto, argumento, assunto, conteudo, criado_em"
        )
        .order("criado_em", { ascending: false });

      setModelos((dadosModelos as ModeloSalvo[]) ?? []);

      setCarregando(false);
    }

    carregar();
  }, [router]);

  const copiarModelo = async (modelo: ModeloSalvo) => {
    try {
      const texto =
        modelo.canal === "email" && modelo.assunto
          ? `${modelo.assunto}\n\n${modelo.conteudo}`
          : modelo.conteudo;

      await navigator.clipboard.writeText(texto);
      setCopiadoId(modelo.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      console.error("Não conseguimos copiar.");
    }
  };

  const excluirModelo = async (id: string) => {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    await supabase.from("modelos").delete().eq("id", id);

    setModelos((atual) => atual.filter((m) => m.id !== id));
    if (abertoId === id) setAbertoId(null);
  };

  const carregarCadencias = async () => {
    setCarregandoCadencias(true);
    setErroCadencia("");
    try {
      const res = await fetch("/api/crm/cadencia");
      if (!res.ok) throw new Error("Falha ao carregar cadências.");
      const json = await res.json();
      setCadencias((json.cadencias ?? []) as CadenciaModelo[]);
    } catch {
      setErroCadencia("Não foi possível carregar as cadências.");
    } finally {
      setCarregandoCadencias(false);
    }
  };

  useEffect(() => {
    if (aba === "cadencias") void carregarCadencias();
  }, [aba]);

  const abrirNovaCadencia = () => {
    setErroCadencia("");
    setFormCadencia({
      id: null,
      nome: "",
      descricao: "",
      etapas: [{ tipo_atividade: "email", titulo: "", atraso_dias: 0, script: "" }],
    });
    setModalCadencia(true);
  };

  const abrirEdicaoCadencia = (c: CadenciaModelo) => {
    setErroCadencia("");
    setFormCadencia({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      etapas: c.etapas.map((e) => ({ ...e })),
    });
    setModalCadencia(true);
  };

  const salvarCadencia = async () => {
    setErroCadencia("");
    const etapas = formCadencia.etapas.filter((e) => e.titulo.trim() !== "");
    if (!formCadencia.nome.trim()) {
      setErroCadencia("Informe um nome para a cadência.");
      return;
    }
    if (etapas.length === 0) {
      setErroCadencia("Adicione pelo menos uma etapa com título.");
      return;
    }
    setSalvandoCadencia(true);
    try {
      const acao = formCadencia.id ? "atualizar" : "criar";
      const res = await fetch(`/api/crm/cadencia?acao=${acao}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cadencia_id: formCadencia.id,
          nome: formCadencia.nome,
          descricao: formCadencia.descricao,
          etapas: etapas.map((e) => ({
            tipo_atividade: e.tipo_atividade,
            titulo: e.titulo,
            atraso_dias: e.atraso_dias,
            script: e.script,
          })),
        }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErroCadencia(dados?.erro ?? "Não foi possível salvar a cadência.");
        return;
      }
      setModalCadencia(false);
      await carregarCadencias();
      setAba("cadencias");
    } finally {
      setSalvandoCadencia(false);
    }
  };

  const excluirCadencia = async (c: CadenciaModelo) => {
    if (!window.confirm(`Excluir a cadência "${c.nome}"?`)) return;
    setErroCadencia("");
    const res = await fetch(`/api/crm/cadencia?acao=excluir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cadencia_id: c.id }),
    });
    if (!res.ok) {
      const dados = await res.json().catch(() => ({}));
      setErroCadencia(dados?.erro ?? "Não foi possível excluir a cadência.");
      return;
    }
    setCadencias((atual) => atual.filter((x) => x.id !== c.id));
  };

  const atualizarEtapa = (i: number, campo: keyof EtapaCadencia, valor: string | number) => {
    setFormCadencia((atual) => ({
      ...atual,
      etapas: atual.etapas.map((e, idx) =>
        idx === i ? { ...e, [campo]: valor } : e
      ),
    }));
  };

  return (
    <>
      <Sidebar
        perfil={perfil}
        saldoCreditos={saldoCreditos}
        aoAbrirPerfil={() => setModalPerfilAberto(true)}
      />

      <ModalPerfil
        key={`perfil-modelos-${modalPerfilAberto}-${perfil?.produtos_servicos ? "ok" : "vazio"}`}
        aberto={modalPerfilAberto}
        perfil={perfil}
        aoFechar={() => setModalPerfilAberto(false)}
        aoSalvar={setPerfil}
      />

      <main className="min-h-screen bg-pipe-dark px-6 py-12 lg:pl-72">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <Link href="/prospeccao" className="font-display text-3xl text-white">
              FP <span className="text-pipe-lime">Pipe</span>
            </Link>

            <Link
              href="/prospeccao"
              className="bg-pipe-lime text-black font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition text-sm"
            >
              + Nova prospecção
            </Link>
          </div>

          <h1 className="font-display text-5xl text-white mt-10">Modelos/Cadências</h1>

          <div className="mt-6 flex items-center gap-2 border border-pipe-border rounded-xl p-1 bg-pipe-card w-fit">
            <button
              onClick={() => setAba("modelos")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                aba === "modelos"
                  ? "bg-pipe-lime text-black"
                  : "text-gray-300 hover:bg-pipe-dark"
              }`}
            >
              ⭐ Modelos de mensagem
            </button>
            <button
              onClick={() => setAba("cadencias")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                aba === "cadencias"
                  ? "bg-pipe-lime text-black"
                  : "text-gray-300 hover:bg-pipe-dark"
              }`}
            >
              🔁 Cadências
            </button>
          </div>

          {aba === "modelos" && (
            <>
          <p className="text-pipe-muted mt-8 max-w-2xl">
            Suas abordagens salvas como modelo. Consulte, copie e reutilize o
            que funciona — a qualquer momento. ⭐
          </p>

          {!carregando && modelos.length === 0 && (
            <p className="text-center text-pipe-muted mt-16">
              Nenhum modelo ainda. Gere uma abordagem e clique em{" "}
              <span className="text-amber-400">⭐ Salvar como modelo</span> pra
              guardá-la aqui.
            </p>
          )}

          <div className="mt-8 space-y-3">
            {modelos.map((modelo) => (
              <div
                key={modelo.id}
                className="bg-pipe-card border border-pipe-border rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      ⭐ {modelo.nome}
                    </p>
                    <p className="text-xs text-pipe-muted mt-1">
                      {ICONE_CANAL[modelo.canal] ?? modelo.canal}
                      {" · "}
                      {new Date(modelo.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copiarModelo(modelo)}
                      className="text-xs font-semibold bg-pipe-lime text-black px-3 py-2 rounded-lg hover:opacity-90 transition"
                    >
                      {copiadoId === modelo.id ? "✅ Copiado!" : "📋 Copiar"}
                    </button>

                    <button
                      onClick={() =>
                        setAbertoId(abertoId === modelo.id ? null : modelo.id)
                      }
                      className="text-xs font-semibold border border-pipe-border text-gray-300 px-3 py-2 rounded-lg hover:bg-pipe-dark transition"
                    >
                      {abertoId === modelo.id ? "▲ Fechar" : "▼ Ver texto"}
                    </button>

                    <button
                      onClick={() => excluirModelo(modelo.id)}
                      title="Excluir modelo"
                      className="text-xs font-semibold border border-red-500/30 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {abertoId === modelo.id && (
                  <div className="mt-4 space-y-2">
                    {modelo.argumento && (
                      <p className="text-xs text-pipe-lime border-l-2 border-pipe-lime/40 pl-3">
                        {modelo.argumento}
                      </p>
                    )}

                    {modelo.canal === "email" && modelo.assunto && (
                      <p className="text-sm text-gray-200">
                        <strong>Assunto:</strong> {modelo.assunto}
                      </p>
                    )}

                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed bg-pipe-dark border border-pipe-border rounded-xl p-4">
{modelo.conteudo}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
            </>
          )}

          {aba === "cadencias" && (
            <>
              <div className="mt-8 flex items-center justify-between">
                <p className="text-pipe-muted max-w-2xl">
                  Modelos de follow-up. Crie a sua própria sequência de contatos
                  e aplique aos leads direto do CRM.
                </p>
                <button
                  onClick={abrirNovaCadencia}
                  className="bg-pipe-lime text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition text-sm"
                >
                  + Nova cadência
                </button>
              </div>

              {erroCadencia && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mt-4">
                  {erroCadencia}
                </p>
              )}

              {carregandoCadencias ? (
                <p className="text-sm text-pipe-muted mt-10">
                  Carregando cadências…
                </p>
              ) : cadencias.length === 0 ? (
                <p className="text-center text-pipe-muted mt-16">
                  Nenhuma cadência ainda. Crie a primeira com{" "}
                  <span className="text-pipe-lime">+ Nova cadência</span>.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {cadencias.map((c) => (
                    <div
                      key={c.id}
                      className="bg-pipe-card border border-pipe-border rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">
                            🔁 {c.nome}
                          </p>
                          <p className="text-xs text-pipe-muted mt-1">
                            {c.etapas.length}{" "}
                            {c.etapas.length === 1 ? "etapa" : "etapas"} ·{" "}
                            {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                          </p>
                          {c.descricao && (
                            <p className="text-xs text-gray-400 mt-1">
                              {c.descricao}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => abrirEdicaoCadencia(c)}
                            className="text-xs font-semibold border border-pipe-border text-gray-300 px-3 py-2 rounded-lg hover:bg-pipe-dark transition"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => excluirCadencia(c)}
                            title="Excluir cadência"
                            className="text-xs font-semibold border border-red-500/30 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {c.etapas.map((e, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 bg-pipe-dark border border-pipe-border rounded-lg p-3"
                          >
                            <span className="shrink-0 text-xs font-bold text-pipe-lime border border-pipe-lime/40 rounded-full w-6 h-6 flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white">
                                {TIPOS_ATIVIDADE[e.tipo_atividade] ??
                                  e.tipo_atividade}{" "}
                                · {e.titulo}
                              </p>
                              <p className="text-xs text-pipe-muted mt-0.5">
                                {e.atraso_dias > 0
                                  ? `Após ${e.atraso_dias} dia${e.atraso_dias === 1 ? "" : "s"}`
                                  : "Imediato"}
                                {e.script ? ` — ${e.script}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {modalCadencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-pipe-card border border-pipe-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-white">
                {formCadencia.id ? "Editar cadência" : "Nova cadência"}
              </h3>
              <button
                onClick={() => setModalCadencia(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {erroCadencia && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
                {erroCadencia}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-pipe-muted mb-1">
                  Nome *
                </label>
                <input
                  value={formCadencia.nome}
                  onChange={(e) =>
                    setFormCadencia((atual) => ({
                      ...atual,
                      nome: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Prospecção fria"
                  className="w-full bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-pipe-muted mb-1">
                  Descrição
                </label>
                <input
                  value={formCadencia.descricao}
                  onChange={(e) =>
                    setFormCadencia((atual) => ({
                      ...atual,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder="Para que serve esta cadência?"
                  className="w-full bg-pipe-bg border border-pipe-border rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-pipe-muted">
                    Etapas *
                  </label>
                  <button
                    onClick={() =>
                      setFormCadencia((atual) => ({
                        ...atual,
                        etapas: [
                          ...atual.etapas,
                          {
                            tipo_atividade: "email",
                            titulo: "",
                            atraso_dias: 0,
                            script: "",
                          },
                        ],
                      }))
                    }
                    className="text-xs text-pipe-lime font-semibold hover:underline"
                  >
                    + Adicionar etapa
                  </button>
                </div>

                <div className="space-y-3">
                  {formCadencia.etapas.map((e, i) => (
                    <div
                      key={i}
                      className="bg-pipe-dark border border-pipe-border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-pipe-lime">
                          Etapa {i + 1}
                        </span>
                        <button
                          onClick={() =>
                            setFormCadencia((atual) => ({
                              ...atual,
                              etapas: atual.etapas.filter(
                                (_, idx) => idx !== i
                              ),
                            }))
                          }
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remover
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={e.tipo_atividade}
                          onChange={(ev) =>
                            atualizarEtapa(i, "tipo_atividade", ev.target.value)
                          }
                          className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-2 text-sm text-white"
                        >
                          {Object.entries(TIPOS_ATIVIDADE).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={e.atraso_dias}
                          onChange={(ev) =>
                            atualizarEtapa(i, "atraso_dias", Number(ev.target.value))
                          }
                          placeholder="Atraso (dias)"
                          className="bg-pipe-bg border border-pipe-border rounded-lg px-2 py-2 text-sm text-white"
                        />
                      </div>

                      <input
                        value={e.titulo}
                        onChange={(ev) =>
                          atualizarEtapa(i, "titulo", ev.target.value)
                        }
                        placeholder="Título da etapa"
                        className="w-full bg-pipe-bg border border-pipe-border rounded-lg px-2 py-2 text-sm text-white"
                      />

                      <textarea
                        value={e.script}
                        onChange={(ev) =>
                          atualizarEtapa(i, "script", ev.target.value)
                        }
                        placeholder="Script / observação"
                        rows={2}
                        className="w-full bg-pipe-bg border border-pipe-border rounded-lg px-2 py-2 text-sm text-white resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setModalCadencia(false)}
                className="border border-pipe-border text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-pipe-dark transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCadencia}
                disabled={salvandoCadencia}
                className="bg-pipe-lime text-black font-semibold px-5 py-2 rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50"
              >
                {salvandoCadencia
                  ? "Salvando…"
                  : formCadencia.id
                    ? "Salvar alterações"
                    : "Criar cadência"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
