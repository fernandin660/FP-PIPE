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
  geracoes_usadas: number;
  status: string;
};

export default function PaginaDisparos() {
  const [listas, setListas] = useState<Lista[]>([]);
  const [listaId, setListaId] = useState("");
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [destinatarios, setDestinatarios] = useState(0);
  const [instrucoes, setInstrucoes] = useState("");
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

  useEffect(() => {
    async function carregar() {
      const supabase = criarClienteSupabase();
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/login";
        return;
      }
      const [{ data: listasData }, { data: perfilData }, { data: iaData }] = await Promise.all([
        supabase.from("listas").select("id, nome").order("criado_em", { ascending: false }),
        supabase.from("perfil").select("nome_empresa, area_atuacao, produtos_servicos, nichos, foto_url").eq("usuario_id", userData.user.id).maybeSingle(),
        supabase.from("creditos_ia").select("saldo").eq("usuario_id", userData.user.id).maybeSingle(),
      ]);
      setListas((listasData as Lista[]) ?? []);
      setPerfil((perfilData as PerfilVendedor) ?? null);
      setSaldoIa(iaData?.saldo ?? 0);
      const conexaoResposta = await fetch("/api/email/conexao");
      if (conexaoResposta.ok) {
        const conexaoDados = await conexaoResposta.json();
        setConexao(conexaoDados.conexao ?? null);
      }
      const resultadoEmail = new URLSearchParams(window.location.search).get("email");
      if (resultadoEmail === "conectado") setMensagem("Gmail conectado com sucesso.");
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
    if (!campanha || campanha.geracoes_usadas >= 3 || gerando) return;
    setGerando(true);
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch("/api/campanhas/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campanhaId: campanha.id, instrucoes }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível gerar a abordagem.");
      setCampanha(dados.campanha);
      setAssunto(dados.campanha.assunto ?? "");
      setCorpo(dados.campanha.corpo ?? "");
      setSaldoIa(dados.saldoIa);
      setMensagem(`Geração concluída. Restam ${dados.geracoesRestantes} geração(ões) nesta campanha.`);
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

  async function enviarCampanha() {
    if (!campanha || enviando || !conexao) return;
    if (!confirm(`Enviar para ${destinatarios} destinatário(s) usando ${conexao.email}?`)) return;
    setEnviando(true);
    setErro("");
    try {
      let totalEnviado = 0;
      let totalFalha = 0;
      let pendentes = 1;
      while (pendentes > 0) {
        const resposta = await fetch("/api/campanhas/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campanhaId: campanha.id }) });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro ?? "Não foi possível enviar a campanha.");
        totalEnviado += dados.enviados ?? 0;
        totalFalha += dados.falhas ?? 0;
        pendentes = dados.pendentes ?? 0;
        setMensagem(`Enviando... ${totalEnviado} enviado(s), ${pendentes} pendente(s).`);
      }
      setMensagem(`Campanha concluída: ${totalEnviado} enviado(s), ${totalFalha} falha(s).`);
      await selecionarLista(listaId);
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
            <p className="text-pipe-muted mt-2">Uma campanha por lista, com até 3 gerações de IA.</p>
          </div>
          <span className="text-sm text-pipe-muted">IA disponível: <b className="text-pipe-lime">{saldoIa ?? 0}</b></span>
        </div>

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
            <span className="text-xs rounded-full bg-pipe-lime/10 border border-pipe-lime/30 text-pipe-lime px-2 py-1">{campanha.geracoes_usadas}/3 gerações usadas</span>
          </div>
          <textarea value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} placeholder="Instruções opcionais para a IA..." className="w-full min-h-20 bg-pipe-dark border border-pipe-border rounded-lg px-3 py-2 text-sm text-white" />
          <button onClick={() => void gerar()} disabled={gerando || campanha.geracoes_usadas >= 3 || (saldoIa ?? 0) < 1} className="bg-pipe-lime text-pipe-dark px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40">{gerando ? "Gerando..." : campanha.geracoes_usadas >= 3 ? "Limite de gerações atingido" : "Gerar abordagem (1 crédito)"}</button>
          <input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Assunto" className="w-full bg-pipe-dark border border-pipe-border rounded-lg px-3 py-3 text-sm text-white" />
          <textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder="Corpo do e-mail" className="w-full min-h-64 bg-pipe-dark border border-pipe-border rounded-lg px-3 py-3 text-sm text-white" />
          <button onClick={() => void salvarEdicao()} className="border border-pipe-border text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pipe-dark">Salvar edição</button>
          {enriquecendo ? <div className="rounded-lg border border-pipe-blue/30 bg-pipe-blue/10 p-3 text-sm text-pipe-blue">🔎 Enriquecendo e-mails, telefones e sites das empresas... aguarde o carregamento dos destinatários.</div> : destinatarios === 0 && <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-200">Não encontramos e-mails públicos válidos nesta lista. Você pode adicionar e-mails aos leads e sincronizar novamente.</div>}
          {conexao ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pipe-lime/30 bg-pipe-lime/10 p-3 text-sm text-pipe-lime"><span>Gmail conectado: {conexao.email}</span><div className="flex gap-2"><button onClick={() => void desconectarEmail()} className="rounded-lg border border-pipe-lime/40 px-3 py-2 text-xs font-semibold hover:bg-pipe-lime/10">Desconectar</button><button onClick={() => void enviarCampanha()} disabled={enviando || campanha.status === "enviada" || destinatarios === 0} className="rounded-lg bg-pipe-lime px-4 py-2 font-bold text-pipe-dark disabled:opacity-40">{enviando ? "Enviando..." : campanha.status === "enviada" ? "Campanha enviada" : destinatarios === 0 ? "Sem destinatários" : "Enviar campanha"}</button></div></div> : <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200"><span>Conecte Gmail, Outlook ou Zoho para liberar o envio.</span><a href="/api/email/google/iniciar" className="rounded-lg bg-yellow-300 px-4 py-2 font-bold text-pipe-dark">Conectar Gmail</a></div>}
        </section>}

        {mensagem && <p className="mt-4 text-sm text-pipe-lime">{mensagem}</p>}
        {erro && <p className="mt-4 text-sm text-red-400">{erro}</p>}
      </main>
    </div>
  );
}
