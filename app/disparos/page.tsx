"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { criarClienteSupabase } from "../../lib/supabase/client";
import Sidebar from "../../components/Sidebar";
import type { PerfilVendedor } from "../../components/ModalPerfil";

type Lista = { id: string; nome: string };
type Campanha = {
  id: string;
  lista_id: string;
  nome: string;
  assunto: string | null;
  corpo: string | null;
  objetivo: string;
  geracoes_usadas: number;
  status: string;
};
type Modelo = { id: string; nome: string; assunto: string | null; conteudo: string; objetivo: string };

export default function PaginaDisparos() {
  const [listas, setListas] = useState<Lista[]>([]);
  const [listaId, setListaId] = useState("");
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [destinatarios, setDestinatarios] = useState(0);
  const [instrucoes, setInstrucoes] = useState("");
  const [objetivo, setObjetivo] = useState("gerar_interesse");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [perfil, setPerfil] = useState<PerfilVendedor | null>(null);
  const [saldoIa, setSaldoIa] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoCampanha, setCarregandoCampanha] = useState(false);
  const [enriquecendo, setEnriquecendo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [conexao, setConexao] = useState<{ provedor: string; email: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [salvandoModelo, setSalvandoModelo] = useState(false);

  useEffect(() => {
    async function carregar() {
      const supabase = criarClienteSupabase();
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/login";
        return;
      }
      const respostaOrg = await fetch("/api/org");
      const dadosOrg = respostaOrg.ok ? await respostaOrg.json() : null;
      const orgId = dadosOrg?.orgId as string | undefined;
      const [{ data: listasData }, { data: perfilData }, { data: iaData }] = await Promise.all([
        supabase.from("listas").select("id, nome").order("criado_em", { ascending: false }),
        supabase.from("perfil").select("nome_empresa, area_atuacao, produtos_servicos, nichos, foto_url").eq("usuario_id", userData.user.id).maybeSingle(),
        supabase.from("creditos_ia").select("saldo").eq(orgId ? "organizacao_id" : "usuario_id", orgId ?? userData.user.id).maybeSingle(),
      ]);
      setListas((listasData as Lista[]) ?? []);
      setPerfil((perfilData as PerfilVendedor) ?? null);
      setSaldoIa(iaData?.saldo ?? 0);
      const { data: modelosData } = await supabase.from("modelos").select("id, nome, assunto, conteudo, objetivo").eq("canal", "email").order("criado_em", { ascending: false });
      setModelos((modelosData as Modelo[]) ?? []);
      const conexaoResposta = await fetch("/api/email/conexao");
      if (conexaoResposta.ok) {
        const conexaoDados = await conexaoResposta.json();
        setConexao(conexaoDados.conexao ?? null);
      }
      const resultadoEmail = new URLSearchParams(window.location.search).get("email");
      if (resultadoEmail && resultadoEmail !== "conectado") {
        const detalhe = new URLSearchParams(window.location.search).get("detalhe");
        setErro(`Não foi possível concluir a conexão Gmail (${detalhe ?? resultadoEmail}).`);
      }
      setCarregando(false);
    }
    void carregar();
  }, []);

  async function selecionarLista(id: string) {
    setListaId(id);
    setCampanha(null);
    setAssunto("");
    setCorpo("");
    setObjetivo("gerar_interesse");
    setMensagem("");
    setErro("");
    if (!id) return;
    setCarregandoCampanha(true);
    try {
      const resposta = await fetch(`/api/campanhas?listaId=${encodeURIComponent(id)}`);
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível carregar a campanha.");
      setCampanha(dados.campanha ?? null);
      setDestinatarios(dados.destinatarios?.length ?? 0);
      setEnriquecendo(true);
      try {
        const enriquecimento = await fetch("/api/enriquecer-lista", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listaId: id }) });
        if (!enriquecimento.ok) setMensagem("Lista carregada. Alguns dados podem ainda não estar enriquecidos.");
      } finally {
        setEnriquecendo(false);
      }
      if (dados.campanha?.id) {
        const sincronizacao = await fetch("/api/campanhas/sincronizar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campanhaId: dados.campanha.id }) });
        if (sincronizacao.ok) {
          const dadosSincronizacao = await sincronizacao.json();
          setDestinatarios(dadosSincronizacao.destinatarios ?? dados.destinatarios?.length ?? 0);
        }
      }
      setAssunto(dados.campanha?.assunto ?? "");
      setCorpo(dados.campanha?.corpo ?? "");
      setObjetivo(dados.campanha?.objetivo ?? "gerar_interesse");
    } catch (erroBusca) {
      setErro(erroBusca instanceof Error ? erroBusca.message : "Falha ao carregar campanha.");
    } finally {
      setCarregandoCampanha(false);
    }
  }

  async function criarCampanha() {
    if (!listaId || campanha) return;
    setErro("");
    const resposta = await fetch("/api/campanhas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listaId }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível criar a campanha.");
      return;
    }
    setCampanha(dados.campanha);
    setDestinatarios(dados.destinatarios ?? 0);
  }

  async function gerar() {
    if (!campanha || gerando) return;
    setGerando(true);
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch("/api/campanhas/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campanhaId: campanha.id, instrucoes, objetivo }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível gerar a abordagem.");
      setCampanha(dados.campanha);
      setAssunto(dados.campanha.assunto ?? "");
      setCorpo(dados.campanha.corpo ?? "");
      setSaldoIa(dados.saldoIa);
      setMensagem("Geração concluída. O crédito foi descontado do saldo mensal de abordagens.");
    } catch (erroGeracao) {
      setErro(erroGeracao instanceof Error ? erroGeracao.message : "Falha na geração.");
    } finally {
      setGerando(false);
    }
  }

  async function salvarEdicao() {
    if (!campanha || !assunto.trim() || !corpo.trim()) return;
    setErro("");
    const resposta = await fetch("/api/campanhas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campanhaId: campanha.id, assunto, corpo }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível salvar a edição.");
      return;
    }
    setCampanha(dados.campanha);
    setMensagem("Campanha salva.");
  }

  function importarModelo(modeloId: string) {
    const modelo = modelos.find((item) => item.id === modeloId);
    if (!modelo) return;
    setAssunto(modelo.assunto ?? "");
    setCorpo(modelo.conteudo);
    setObjetivo(modelo.objetivo || "gerar_interesse");
    setMensagem("Modelo importado. Revise e salve a campanha.");
  }

  async function salvarComoModelo() {
    if (!campanha || salvandoModelo || !assunto.trim() || !corpo.trim()) return;
    const nome = window.prompt("Nome do modelo:", `Modelo - ${campanha.nome}`);
    if (!nome?.trim()) return;
    setSalvandoModelo(true);
    setErro("");
    try {
      const resposta = await fetch("/api/campanhas/modelo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campanhaId: campanha.id, nome, assunto, texto: corpo }) });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível salvar o modelo.");
      setMensagem("Abordagem salva em Modelos.");
    } catch (erroModelo) {
      setErro(erroModelo instanceof Error ? erroModelo.message : "Falha ao salvar modelo.");
    } finally {
      setSalvandoModelo(false);
    }
  }

  async function enviarCampanha() {
    if (!campanha || enviando || !conexao) return;
    if (!confirm(`Enviar para ${destinatarios} destinatário(s) usando ${conexao.email}?`)) return;
    setEnviando(true);
    setErro("");
    try {
      let totalEnviado = 0;
      let totalFalha = 0;
      let pendentes = 1;
      let limiteAtingido = false;
      let enviosRestantesHoje: number | null = null;
      while (pendentes > 0) {
        const resposta = await fetch("/api/campanhas/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campanhaId: campanha.id }) });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível enviar a campanha.");
        totalEnviado += dados.enviados ?? 0;
        totalFalha += dados.falhas ?? 0;
        pendentes = dados.pendentes ?? 0;
        limiteAtingido = Boolean(dados.limiteAtingido);
        enviosRestantesHoje = typeof dados.enviosRestantesHoje === "number" ? dados.enviosRestantesHoje : enviosRestantesHoje;
        setMensagem(`Enviando... ${totalEnviado} enviado(s), ${pendentes} pendente(s).`);
        if (limiteAtingido) break;
      }
      setMensagem(limiteAtingido
        ? `Limite diário atingido. ${totalEnviado} enviado(s); ${pendentes} destinatário(s) ficaram pendentes.`
        : totalFalha === 0
        ? `✅ E-mails disparados com sucesso: ${totalEnviado} enviado(s). Restam ${enviosRestantesHoje ?? "--"} envios hoje.`
        : `Campanha concluída: ${totalEnviado} enviado(s), ${totalFalha} falha(s).`);
      setCampanha((atual) => atual ? { ...atual, status: totalFalha === 0 ? "enviada" : "pronta" } : atual);
    } catch (erroEnvio) {
      setErro(erroEnvio instanceof Error ? erroEnvio.message : "Falha no envio.");
    } finally {
      setEnviando(false);
    }
  }

  async function desconectarEmail() {
    if (!confirm(`Desconectar ${conexao?.email ?? "esta conta"}?`)) return;
    const resposta = await fetch("/api/email/conexao", { method: "DELETE" });
    if (!resposta.ok) {
      setErro("Não foi possível desconectar a conta de e-mail.");
      return;
    }
    setConexao(null);
    setMensagem("Conta de e-mail desconectada. Você pode conectar outra.");
  }

  function iniciarNovoDisparo() {
    setListaId("");
    setCampanha(null);
    setDestinatarios(0);
    setAssunto("");
    setCorpo("");
    setObjetivo("gerar_interesse");
    setInstrucoes("");
    setMensagem("");
    setErro("");
  }

  if (carregando) return <main className="flex min-h-screen items-center justify-center bg-pipe-dark text-gray-400">Carregando...</main>;

  return (
    <div className="min-h-screen bg-pipe-dark text-white">
      <Sidebar perfil={perfil} saldoCreditos={null} aoAbrirPerfil={() => undefined} />
      <main className="lg:pl-64 px-5 py-8 max-w-5xl mx-auto">
        <Link href="/listas" className="text-sm text-pipe-muted hover:text-white">← Voltar para listas</Link>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-pipe-lime">Campanhas</p>
            <h1 className="font-display text-4xl text-white mt-2">Disparos em massa</h1>
          <p className="text-pipe-muted mt-2">Gere e edite abordagens usando seu saldo mensal de créditos.</p>
          </div>
          <span className="text-sm text-pipe-muted">IA disponível: <b className="text-pipe-lime">{saldoIa ?? 0}</b></span>
        </div>

        <section className="mt-6 rounded-xl border border-pipe-border bg-pipe-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-pipe-muted">E-mail de envio</p>
              <p className="mt-1 text-sm text-white">
                {conexao ? `${conexao.provedor === "microsoft" ? "Outlook" : conexao.provedor === "zoho" ? "Zoho" : "Gmail"}: ${conexao.email}` : "Nenhum e-mail conectado"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${conexao ? "bg-green-500/15 text-green-300 border border-green-500/30" : "bg-gray-500/15 text-gray-300 border border-gray-500/30"}`}>
                {conexao ? "Ativo" : "Inativo"}
              </span>
              {conexao ? <button onClick={() => void desconectarEmail()} className="rounded-lg border border-pipe-border px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-pipe-dark">Trocar</button> : <div className="flex gap-2"><a href="/api/email/zoho/iniciar" className="rounded-lg bg-pipe-lime px-3 py-2 text-xs font-bold text-pipe-dark">Conectar Zoho</a><a href="/api/email/microsoft/iniciar" className="rounded-lg border border-pipe-border px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-pipe-dark">Outlook</a></div>}
            </div>
          </div>
        </section>

        <section className="mt-8 bg-pipe-card border border-pipe-border rounded-xl p-5">
          <label className="block text-xs uppercase tracking-wide text-pipe-muted mb-2">Lista de destinatários</label>
          <select value={listaId} onChange={(e) => void selecionarLista(e.target.value)} className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-3 text-sm text-white">
            <option value="">Selecione uma lista...</option>
            {listas.map((lista) => <option key={lista.id} value={lista.id}>{lista.nome}</option>)}
          </select>
          {carregandoCampanha && <p className="text-xs text-pipe-muted mt-3">Carregando campanha...</p>}
          {listaId && !campanha && !carregandoCampanha && <button onClick={() => void criarCampanha()} className="mt-4 bg-pipe-blue text-white px-4 py-2 rounded-lg text-sm font-semibold">Criar campanha para esta lista</button>}
          {campanha && <p className="text-sm text-pipe-muted mt-3">{destinatarios} destinatário(s) com e-mail encontrado(s) nesta lista.</p>}
        </section>

        {campanha && <section className="mt-5 bg-pipe-card border border-pipe-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Mensagem da campanha</h2>
          <span className="text-xs rounded-full bg-pipe-lime/10 border border-pipe-lime/30 text-pipe-lime px-2 py-1">{campanha.geracoes_usadas} geração(ões) usadas</span>
          </div>
          <label className="block text-xs uppercase tracking-wide text-pipe-muted">Finalidade do e-mail</label>
          <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-3 text-sm text-white">
            <option value="gerar_interesse">Gerar interesse e iniciar conversa</option>
            <option value="agendar_reuniao">Agendar reunião</option>
            <option value="descobrir_responsavel">Descobrir o responsável</option>
            <option value="fazer_diagnostico">Fazer diagnóstico</option>
            <option value="apresentar_solucao">Apresentar solução</option>
            <option value="follow_up">Fazer follow-up</option>
            <option value="reativar_contato">Reativar contato</option>
          </select>
          <textarea value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} placeholder="Instruções opcionais para a IA..." className="w-full min-h-20 bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white" />
          {modelos.length > 0 && <div className="flex flex-wrap items-center gap-2"><label className="text-xs text-pipe-muted">Importar modelo:</label><select defaultValue="" onChange={(e) => importarModelo(e.target.value)} className="flex-1 min-w-48 bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white"><option value="">Escolha um modelo salvo...</option>{modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.nome}</option>)}</select></div>}
          <button onClick={() => void gerar()} disabled={gerando || (saldoIa ?? 0) < 1} className="bg-pipe-lime text-pipe-dark px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40">{gerando ? "Gerando..." : "Gerar abordagem (1 crédito)"}</button>
          <input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Assunto" className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-3 text-sm text-white" />
          <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Corpo do e-mail" className="w-full min-h-64 bg-pipe-dark border border-pipe-border rounded-lg px-3 py-3 text-sm text-white" />
          <button onClick={() => void salvarEdicao()} className="border border-pipe-border text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pipe-dark">Salvar edição</button>
          <button onClick={() => void salvarComoModelo()} disabled={salvandoModelo || !assunto.trim() || !corpo.trim()} className="border border-pipe-blue/50 text-pipe-blue px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pipe-blue/10 disabled:opacity-40">⭐ Salvar como modelo</button>
          {enriquecendo ? <div className="rounded-lg border border-pipe-blue/30 bg-pipe-blue/10 p-3 text-sm text-pipe-blue">🔎 Enriquecendo e-mails, telefones e sites das empresas... aguarde o carregamento dos destinatários.</div> : destinatarios === 0 && <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-200">Não encontramos e-mails públicos válidos nesta lista. Você pode adicionar e-mails aos leads e sincronizar novamente.</div>}
          {conexao && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pipe-lime/30 bg-pipe-lime/10 p-3 text-sm text-pipe-lime"><span>Conta pronta para envio.</span><button onClick={() => void enviarCampanha()} disabled={enviando || campanha.status === "enviada" || destinatarios === 0} className="rounded-lg bg-pipe-lime px-4 py-2 font-bold text-pipe-dark disabled:opacity-40">{enviando ? "Enviando..." : campanha.status === "enviada" ? "Campanha enviada" : destinatarios === 0 ? "Sem destinatários" : "Enviar campanha"}</button></div>}
        </section>}

        {mensagem && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-pipe-lime"><p>{mensagem}</p>{mensagem.startsWith("✅") && <button onClick={iniciarNovoDisparo} className="rounded-lg border border-pipe-lime/40 px-3 py-1.5 font-semibold hover:bg-pipe-lime/10">Novo disparo</button>}</div>}
        {erro && <p className="mt-4 text-sm text-red-400">{erro}</p>}
      </main>
    </div>
  );
}
