"use client";

import { useEffect, useState } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";

type EmpresaAlvo = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  municipio: string | null;
  uf: string | null;
  endereco: string | null;
  segmento_icp: string | null;
  porte: string | null;
};

type AbordagemSalva = {
  id: string;
  canal: string;
  produto: string;
  objetivo: string;
  argumento: string | null;
  assunto: string | null;
  conteudo: string;
  criado_em: string;
};

type Props = {
  aberto: boolean;
  empresa: EmpresaAlvo | null;
  aoFechar: () => void;
};

const OBJETIVOS = [
  { chave: "agendar_reuniao", rotulo: "📅 Agendar reunião" },
  { chave: "descobrir_responsavel", rotulo: "🔎 Descobrir o responsável" },
  { chave: "fazer_diagnostico", rotulo: "🩺 Fazer diagnóstico" },
  { chave: "apresentar_solucao", rotulo: "💡 Apresentar solução" },
  { chave: "follow_up", rotulo: "🔁 Fazer follow-up" },
  { chave: "reativar_contato", rotulo: "📣 Reativar contato" },
  { chave: "gerar_interesse", rotulo: "✨ Gerar interesse" },
  { chave: "outro", rotulo: "✏️ Outro" },
];

const CANAIS = [
  { chave: "email", rotulo: "✉️ E-mail" },
  { chave: "linkedin", rotulo: "💼 LinkedIn" },
  { chave: "whatsapp", rotulo: "💬 WhatsApp" },
  { chave: "ligacao", rotulo: "📞 Ligação" },
];

export default function ModalAbordagem({
  aberto,
  empresa,
  aoFechar,
}: Props) {
  const [produtos, setProdutos] = useState<string[]>([]);
  const [produtoEscolhido, setProdutoEscolhido] = useState("");
  const [outroTexto, setOutroTexto] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [canal, setCanal] = useState("");

  const [gerando, setGerando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");

  const [resultado, setResultado] = useState<AbordagemSalva | null>(null);
  const [editando, setEditando] = useState(false);
  const [assuntoEdicao, setAssuntoEdicao] = useState("");
  const [conteudoEdicao, setConteudoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [historico, setHistorico] = useState<AbordagemSalva[]>([]);

  const [mostrandoModelo, setMostrandoModelo] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [modeloSalvo, setModeloSalvo] = useState(false);

  useEffect(() => {
    if (!aberto || !empresa) return;

    // Empresa trocou: zera qualquer resultado anterior.
    setResultado(null);
    setEditando(false);
    setCopiado(false);
    setMensagemErro("");

    async function carregar() {
      const supabase = criarClienteSupabase();
      if (!supabase || !empresa) return;

      const { data: dadosPerfil } = await supabase
        .from("perfil")
        .select("nichos")
        .maybeSingle();

      const listaNichos =
        ((dadosPerfil as { nichos?: string[] | null } | null)?.nichos ?? []).filter(
          Boolean
        );

      setProdutos(listaNichos);
      setProdutoEscolhido("__portfolio__");

      const { data: historicoDados } = await supabase
        .from("abordagens")
        .select(
          "id, canal, produto, objetivo, argumento, assunto, conteudo, criado_em"
        )
        .eq("company_id", empresa.id)
        .order("criado_em", { ascending: false })
        .limit(10);

      setHistorico((historicoDados as AbordagemSalva[]) ?? []);
    }

    carregar().catch(() => setProdutos([]));
  }, [aberto, empresa]);

  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  if (!aberto || !empresa) return null;

  const nomeEmpresa =
    empresa.nome_fantasia?.replace(/\s*(LTDA|ME|EIRELI|S\/A|SA)\.?$/i, "").trim() ||
    empresa.razao_social ||
    "empresa";
  const localizacao =
    empresa.endereco ||
    [empresa.municipio, empresa.uf].filter(Boolean).join(", ") ||
    "Brasil";

  const produtoFinal =
    produtoEscolhido === "__outro__"
      ? outroTexto.trim()
      : produtoEscolhido === "__portfolio__"
        ? "__portfolio__"
        : produtoEscolhido;

  const podeGerar = Boolean(produtoFinal && objetivo && canal && !gerando);

  const gerar = async () => {
    if (!podeGerar) return;

    setGerando(true);
    setMensagemErro("");
    setResultado(null);
    setCopiado(false);

    try {
      const resposta = await fetch("/api/gerar-abordagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: empresa.id,
          produto: produtoFinal,
          objetivo,
          canal,
        }),
      });

      const dados = (await resposta.json()) as {
        abordagem?: AbordagemSalva;
        erro?: string;
      };

      if (!resposta.ok || !dados.abordagem) {
        setMensagemErro(dados.erro ?? "Não conseguimos gerar agora.");
        return;
      }

      setResultado(dados.abordagem);
      setHistorico((atual) => [dados.abordagem!, ...atual].slice(0, 10));
    } catch {
      setMensagemErro("Falha de conexão. Tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  const abrirResultado = (abordagem: AbordagemSalva) => {
    setResultado(abordagem);
    setEditando(false);
    setCopiado(false);
    setModeloSalvo(false);
    setMostrandoModelo(false);
    setAssuntoEdicao(abordagem.assunto ?? "");
    setConteudoEdicao(abordagem.conteudo);
  };

  const comecarEdicao = () => {
    if (!resultado) return;

    setAssuntoEdicao(resultado.assunto ?? "");
    setConteudoEdicao(resultado.conteudo);
    setEditando(true);
  };

  const salvarEdicao = async () => {
    if (!resultado || salvandoEdicao || !conteudoEdicao.trim()) return;

    setSalvandoEdicao(true);

    try {
      const resposta = await fetch("/api/gerar-abordagem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resultado.id,
          assunto: assuntoEdicao,
          conteudo: conteudoEdicao,
        }),
      });

      const dados = (await resposta.json()) as { abordagem?: AbordagemSalva };

      if (resposta.ok && dados.abordagem) {
        setResultado(dados.abordagem);
        setEditando(false);
        setHistorico((atual) =>
          atual.map((item) =>
            item.id === dados.abordagem!.id ? dados.abordagem! : item
          )
        );
      }
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const copiar = async () => {
    if (!resultado) return;

    try {
      const texto =
        resultado.canal === "email" && resultado.assunto
          ? `${resultado.assunto}\n\n${resultado.conteudo}`
          : resultado.conteudo;

      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      console.error("Não conseguimos copiar.");
    }
  };

  const salvarComoModelo = async () => {
    if (!resultado || salvandoModelo) return;

    setSalvandoModelo(true);

    try {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      const nomeFinal =
        nomeModelo.trim() ||
        `Modelo ${CANAIS.find((c) => c.chave === resultado.canal)?.rotulo ?? resultado.canal}`;

      const { error } = await supabase.from("modelos").insert({
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
        nome: nomeFinal,
        canal: resultado.canal,
        objetivo: resultado.objetivo,
        produto: resultado.produto,
        argumento: resultado.argumento,
        assunto: resultado.assunto,
        conteudo: resultado.conteudo,
      });

      if (!error) {
        setModeloSalvo(true);
        setMostrandoModelo(false);
        setNomeModelo("");
      }
    } finally {
      setSalvandoModelo(false);
    }
  };

  const rotuloCanal = CANAIS.find((c) => c.chave === resultado?.canal)?.rotulo;

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6 overflow-y-auto py-8">
      <div
        aria-hidden="true"
        onClick={aoFechar}
        className="fixed inset-0 cursor-default"
      />

      <div className="relative bg-pipe-card border border-pipe-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-pipe-card border-b border-pipe-border px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-pipe-muted">
              Gerar abordagem com IA
            </p>
            <h2 className="font-display text-xl text-white mt-0.5">
              {nomeEmpresa}
            </h2>
            <p className="text-xs text-pipe-muted mt-1">
              {[empresa.segmento_icp, empresa.porte, localizacao]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <button
            onClick={aoFechar}
            className="shrink-0 w-8 h-8 rounded-lg border border-pipe-border text-pipe-muted hover:text-white hover:bg-pipe-dark transition"
          >
            ✕
          </button>
        </div>

        {!resultado && (
          <div className="px-6 py-5 space-y-6">
            <section>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-300 mb-3">
                O que você quer oferecer?
              </p>

              <div className="flex flex-wrap gap-2">
                {produtos.map((produto) => (
                  <button
                    key={produto}
                    onClick={() => {
                      setProdutoEscolhido(produto);
                      setOutroTexto("");
                    }}
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border transition ${
                      produtoEscolhido === produto
                        ? "bg-pipe-blue/15 border-pipe-blue text-pipe-blue"
                        : "border-pipe-border text-gray-300 hover:bg-pipe-dark"
                    }`}
                  >
                    {produto}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setProdutoEscolhido("__portfolio__");
                  }}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition ${
                    produtoEscolhido === "__portfolio__"
                      ? "bg-pipe-blue/15 border-pipe-blue text-pipe-blue"
                      : "border-pipe-border text-gray-300 hover:bg-pipe-dark"
                  }`}
                >
                  📦 Todo o portfólio
                </button>

                <button
                  onClick={() => setProdutoEscolhido("__outro__")}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg border transition ${
                    produtoEscolhido === "__outro__"
                      ? "bg-pipe-blue/15 border-pipe-blue text-pipe-blue"
                      : "border-pipe-border text-gray-300 hover:bg-pipe-dark"
                  }`}
                >
                  ✏️ Outro produto
                </button>
              </div>

              {produtoEscolhido === "__outro__" && (
                <input
                  value={outroTexto}
                  onChange={(e) => setOutroTexto(e.target.value)}
                  placeholder="Ex.: Manutenção preventiva de frota"
                  className="mt-3 w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                />
              )}
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-300 mb-2">
                  Objetivo da abordagem
                </label>

                <select
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pipe-blue"
                >
                  <option value="">Selecionar...</option>
                  {OBJETIVOS.map((item) => (
                    <option key={item.chave} value={item.chave}>
                      {item.rotulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-300 mb-2">
                  Canal
                </label>

                <select
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                  className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pipe-blue"
                >
                  <option value="">Selecionar...</option>
                  {CANAIS.map((item) => (
                    <option key={item.chave} value={item.chave}>
                      {item.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {mensagemErro && (
              <p className="text-sm text-red-400">{mensagemErro}</p>
            )}

            <div className="border-t border-pipe-border pt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-pipe-muted">
                Custo:{" "}
                <span className="text-pipe-lime font-bold">
                  1 Crédito de IA
                </span>
              </p>

              <button
                onClick={gerar}
                disabled={!podeGerar}
                className="bg-pipe-lime text-black font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm"
              >
                {gerando ? "🤖 Nossa equipe está escrevendo..." : "Gerar abordagem"}
              </button>
            </div>
          </div>
        )}

        {resultado && (
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[11px] font-semibold text-pipe-muted">
                {rotuloCanal} · ✅ Salvo no histórico
              </span>

              <button
                onClick={() => {
                  setResultado(null);
                  setEditando(false);
                }}
                className="text-xs font-semibold text-pipe-blue hover:underline"
              >
                ← Nova configuração
              </button>
            </div>

            <section className="border border-pipe-lime/30 bg-pipe-lime/5 rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-lime mb-1.5">
                Melhor argumento
              </p>

              <p className="text-sm text-gray-100">{resultado.argumento}</p>
            </section>

            {editando ? (
              <section className="space-y-2">
                {resultado.canal === "email" && (
                  <input
                    value={assuntoEdicao}
                    onChange={(e) => setAssuntoEdicao(e.target.value)}
                    placeholder="Assunto"
                    className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pipe-blue"
                  />
                )}

                <textarea
                  value={conteudoEdicao}
                  onChange={(e) => setConteudoEdicao(e.target.value)}
                  rows={12}
                  className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-gray-200 whitespace-pre-wrap focus:outline-none focus:border-pipe-blue resize-y"
                />

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditando(false)}
                    className="text-xs font-semibold border border-pipe-border text-gray-300 px-4 py-2 rounded-lg hover:bg-pipe-dark transition"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={salvarEdicao}
                    disabled={salvandoEdicao || !conteudoEdicao.trim()}
                    className="text-xs font-bold bg-pipe-lime text-black px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {salvandoEdicao ? "Salvando..." : "💾 Salvar alterações"}
                  </button>
                </div>
              </section>
            ) : (
              <section className="space-y-3">
                {resultado.canal === "email" && resultado.assunto && (
                  <p className="text-sm text-gray-200">
                    <strong>Assunto:</strong> {resultado.assunto}
                  </p>
                )}

                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed bg-pipe-dark border border-pipe-border rounded-xl p-4">
{resultado.conteudo}
                </pre>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copiar}
                    className="text-xs font-semibold bg-pipe-lime text-black px-4 py-2 rounded-lg hover:opacity-90 transition"
                  >
                    {copiado ? "✅ Copiado!" : "📋 Copiar"}
                  </button>

                  <button
                    onClick={comecarEdicao}
                    className="text-xs font-semibold border border-pipe-border text-gray-300 px-4 py-2 rounded-lg hover:bg-pipe-dark transition"
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={gerar}
                    disabled={gerando}
                    className="text-xs font-semibold border border-pipe-border text-gray-300 px-4 py-2 rounded-lg hover:bg-pipe-dark disabled:opacity-50 transition"
                  >
                    {gerando ? "Gerando..." : "🔄 Gerar novamente"}
                  </button>

                  {!modeloSalvo ? (
                    mostrandoModelo ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={nomeModelo}
                          onChange={(e) => setNomeModelo(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") salvarComoModelo();
                          }}
                          placeholder="Nome do modelo"
                          autoFocus
                          className="bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-pipe-blue w-40"
                        />

                        <button
                          onClick={salvarComoModelo}
                          disabled={salvandoModelo}
                          className="text-xs font-bold bg-amber-500 text-black px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {salvandoModelo ? "..." : "Salvar"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMostrandoModelo(true)}
                        className="text-xs font-semibold border border-amber-500/50 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/10 transition"
                      >
                        ⭐ Salvar como modelo
                      </button>
                    )
                  ) : (
                    <span className="text-xs font-semibold text-amber-400 self-center">
                      ⭐ Salvo nos Modelos
                    </span>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {historico.length > 0 && !resultado && (
          <div className="px-6 pb-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-300 mb-3 pt-2 border-t border-pipe-border">
              Histórico deste lead ({historico.length})
            </p>

            <div className="space-y-2">
              {historico.map((item) => (
                <button
                  key={item.id}
                  onClick={() => abrirResultado(item)}
                  className="w-full text-left bg-pipe-dark border border-pipe-border rounded-lg px-4 py-3 hover:border-pipe-blue/50 transition"
                >
                  <p className="text-xs font-semibold text-gray-200 truncate">
                    {item.argumento || item.produto}
                  </p>
                  <p className="text-[11px] text-pipe-muted mt-0.5">
                    {CANAIS.find((c) => c.chave === item.canal)?.rotulo ?? item.canal}
                    {" · "}
                    {new Date(item.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
