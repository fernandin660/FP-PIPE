"use client";

import { useEffect, useRef, useState } from "react";

import { criarClienteSupabase } from "../lib/supabase/client";

export type AnexoPerfil = {
  nome: string;
  url: string;
  tipo: "pdf" | "imagem";
  texto: string;
};

export type PerfilVendedor = {
  nome_empresa?: string | null;
  nome_usuario?: string | null;
  tempo_empresa?: string | null;
  area_atuacao?: string | null;
  departamento_uso?: string | null;
  produtos_servicos?: string | null;
  site?: string | null;
  foto_url?: string | null;
  anexos?: AnexoPerfil[] | null;
  nichos?: string[] | null;
};

export const DEPARTAMENTOS = [
  "Comercial / Vendas",
  "Marketing",
  "Financeiro / Contabilidade",
  "RH / Pessoas",
  "TI / Tecnologia",
  "Operações / Produção",
  "Logística / Supply Chain",
  "Jurídico",
  "Compras / Suprimentos",
  "Diretoria / Presidência",
];

type Props = {
  aberto: boolean;
  obrigatorio?: boolean;
  perfil: PerfilVendedor | null;
  aoFechar: () => void;
  aoSalvar: (perfil: PerfilVendedor) => void;
};

export default function ModalPerfil({
  aberto,
  obrigatorio = false,
  perfil,
  aoFechar,
  aoSalvar,
}: Props) {
  const [nomeEmpresa, setNomeEmpresa] = useState(
    perfil?.nome_empresa ?? ""
  );
  const [nomeUsuario, setNomeUsuario] = useState(
    perfil?.nome_usuario ?? ""
  );
  const [tempoEmpresa, setTempoEmpresa] = useState(
    perfil?.tempo_empresa ?? ""
  );
  const [areaAtuacao, setAreaAtuacao] = useState(
    perfil?.area_atuacao ?? ""
  );
  const [departamentoUso, setDepartamentoUso] = useState(
    perfil?.departamento_uso ?? ""
  );
  const [produtosServicos, setProdutosServicos] = useState(
    perfil?.produtos_servicos ?? ""
  );
  const [site, setSite] = useState(perfil?.site ?? "");
  const [anexos, setAnexos] = useState<AnexoPerfil[]>(
    perfil?.anexos ?? []
  );
  const [nichosEscolhidos, setNichosEscolhidos] = useState<string[]>(
    perfil?.nichos ?? []
  );
  const [sugestoesNichos, setSugestoesNichos] = useState<string[]>([]);
  const [buscandoNichos, setBuscandoNichos] = useState(false);
  const [erroNichos, setErroNichos] = useState("");
  const ultimaChaveSugestao = useRef<string | null>(null);

  const chaveConteudoAtual = `${areaAtuacao.trim()}|${produtosServicos.trim()}`;

  // Sugere automaticamente ao abrir o perfil já preenchido
  useEffect(() => {
    if (!aberto) return;
    if (nichosEscolhidos.length > 0 || sugestoesNichos.length > 0) return;
    const suficiente =
      areaAtuacao.trim().length >= 3 ||
      produtosServicos.trim().length >= 15;
    if (!suficiente) return;
    void buscarSugestoesNichos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    perfil?.foto_url ?? null
  );
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [importandoAdmin, setImportandoAdmin] = useState(false);

  if (!aberto) return null;

  async function enviarAnexo(arquivo: File) {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    setEnviandoAnexo(true);
    setErro("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sessão expirada.");

      const extensao = (arquivo.name.split(".").pop() || "bin").toLowerCase();
      const ehPdf =
        extensao === "pdf" || arquivo.type === "application/pdf";
      const ehImagem = arquivo.type.startsWith("image/");

      if (!ehPdf && !ehImagem) {
        throw new Error("Formato");
      }

      const caminho = `${user.id}/anexo-${Date.now()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("portfolios")
        .upload(caminho, arquivo, { upsert: true });

      if (erroUpload) throw erroUpload;

      const { data } = supabase.storage
        .from("portfolios")
        .getPublicUrl(caminho);

      const resposta = await fetch("/api/extrair-anexo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.publicUrl,
          tipo: ehPdf ? "pdf" : "imagem",
        }),
      });

      const dadosResposta = await resposta.json();

      if (!resposta.ok || !dadosResposta.texto) {
        throw new Error("Leitura");
      }

      setAnexos((atual) => [
        ...atual,
        {
          nome: arquivo.name,
          url: data.publicUrl,
          tipo: ehPdf ? "pdf" : "imagem",
          texto: dadosResposta.texto,
        },
      ]);
    } catch (erroAnexo) {
      console.error("Erro no anexo:", erroAnexo);
      setErro(
        String(erroAnexo) === "Error: Formato"
          ? "Aceitamos apenas PDF e imagens."
          : "Não conseguimos ler este anexo. Tente outro arquivo."
      );
    } finally {
      setEnviandoAnexo(false);
    }
  }

  function removerAnexo(indice: number) {
    setAnexos((atual) => atual.filter((_, i) => i !== indice));
  }

  function alternarNicho(nicho: string) {
    setNichosEscolhidos((atual) =>
      atual.includes(nicho)
        ? atual.filter((n) => n !== nicho)
        : [...atual, nicho]
    );
  }

  async function buscarSugestoesNichos() {
    if (buscandoNichos) return;
    if (!areaAtuacao.trim() && !produtosServicos.trim()) return;

    setBuscandoNichos(true);
    setErroNichos("");

    try {
      const resposta = await fetch("/api/sugerir-nichos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaAtuacao,
          produtosServicos,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !Array.isArray(dados.nichos)) {
        throw new Error(dados.erro || "Erro");
      }

      ultimaChaveSugestao.current = chaveConteudoAtual;
      setSugestoesNichos(dados.nichos);
    } catch (erroSugestao) {
      console.error("Erro ao sugerir nichos:", erroSugestao);
      setErroNichos(
        "Não conseguimos gerar sugestões agora. Você pode digitar os itens manualmente abaixo."
      );
    } finally {
      setBuscandoNichos(false);
    }
  }

  // Dispara a busca quando o usuário termina de preencher um campo
  function talvezBuscarSugestoes() {
    const suficiente =
      areaAtuacao.trim().length >= 3 ||
      produtosServicos.trim().length >= 15;

    if (!suficiente) return;
    if (ultimaChaveSugestao.current === chaveConteudoAtual) return;
    if (buscandoNichos) return;

    void buscarSugestoesNichos();
  }

  function adicionarNichoManual(valor: string) {
    const nicho = valor.trim();
    if (!nicho) return;
    setNichosEscolhidos((atual) =>
      atual.includes(nicho) ? atual : [...atual, nicho]
    );
  }

  async function importarConfiguracoesAdmin() {
    if (importandoAdmin) return;
    setImportandoAdmin(true);
    setErro("");
    try {
      const resposta = await fetch("/api/perfil/importar-admin", { method: "POST" });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.perfil) throw new Error(dados.erro ?? "Importação indisponível.");
      const importado = dados.perfil as PerfilVendedor;
      setNomeEmpresa(importado.nome_empresa ?? "");
      setTempoEmpresa(importado.tempo_empresa ?? "");
      setAreaAtuacao(importado.area_atuacao ?? "");
      setDepartamentoUso(importado.departamento_uso ?? "");
      setProdutosServicos(importado.produtos_servicos ?? "");
      setSite(importado.site ?? "");
      setFotoUrl(importado.foto_url ?? null);
      setAnexos(importado.anexos ?? []);
      setNichosEscolhidos(importado.nichos ?? []);
      aoSalvar(importado);
    } catch (erroImportacao) {
      setErro(erroImportacao instanceof Error ? erroImportacao.message : "Não foi possível importar as configurações.");
    } finally {
      setImportandoAdmin(false);
    }
  }

  async function enviarFoto(arquivo: File) {
    const supabase = criarClienteSupabase();
    if (!supabase) return;

    setEnviandoFoto(true);
    setErro("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sessão expirada.");

      const extensao = arquivo.name.split(".").pop() || "jpg";
      const caminho = `${user.id}/logo-${Date.now()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("logos")
        .upload(caminho, arquivo, { upsert: true });

      if (erroUpload) throw erroUpload;

      const { data } = supabase.storage.from("logos").getPublicUrl(caminho);

      setFotoUrl(data.publicUrl);
    } catch (erroUpload) {
      console.error("Erro no upload da foto:", erroUpload);
      setErro("Não conseguimos enviar a imagem. Tente outra.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (!nomeEmpresa.trim() || !produtosServicos.trim()) {
      setErro("Preencha ao menos o nome da empresa e o que você vende.");
      return;
    }

    const supabase = criarClienteSupabase();
    if (!supabase) {
      setErro("Banco de dados não configurado.");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Sessão expirada.");

      const registro: PerfilVendedor & { usuario_id: string } = {
        usuario_id: user.id,
        nome_empresa: nomeEmpresa.trim(),
        nome_usuario: nomeUsuario.trim() || null,
        tempo_empresa: tempoEmpresa.trim() || null,
        area_atuacao: areaAtuacao.trim(),
        departamento_uso: departamentoUso.trim() || null,
        produtos_servicos: produtosServicos.trim(),
        site: site.trim(),
        foto_url: fotoUrl,
        anexos,
        nichos: nichosEscolhidos,
      };

      const { error: erroSalvar } = await supabase
        .from("perfil")
        .upsert(registro, { onConflict: "usuario_id" });

      if (erroSalvar) throw erroSalvar;

      aoSalvar(registro);
      if (!obrigatorio) aoFechar();
    } catch (erroAoSalvar) {
      console.error("Erro ao salvar perfil:", erroAoSalvar);
      setErro("Não conseguimos salvar o perfil. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-start justify-center px-6 py-8 overflow-y-auto">
      <div className="w-full max-w-lg bg-pipe-card border border-pipe-border rounded-xl p-8 relative max-h-[90vh] overflow-y-auto my-auto">
        {!obrigatorio && (
          <button
            onClick={aoFechar}
            className="absolute top-4 right-5 text-pipe-muted hover:text-white text-xl transition"
            aria-label="Fechar"
          >
            ×
          </button>
        )}

        <h2 className="font-display text-3xl text-white">
          Perfil da{" "}
          <span className="text-pipe-lime">sua empresa</span>
        </h2>

        <p className="text-pipe-muted text-sm mt-2">
          {obrigatorio
            ? "Falta só este passo: conte o que sua empresa vende. Nossa inteligência usa isso para pontuar empresas e escrever e-mails personalizados."
            : "Nossa inteligência usa estes dados para pontuar empresas e escrever e-mails personalizados."}
        </p>

        <button
          type="button"
          onClick={importarConfiguracoesAdmin}
          disabled={importandoAdmin}
          className="mt-4 w-full rounded-lg border border-pipe-blue/50 bg-pipe-blue/10 px-4 py-2.5 text-sm text-pipe-blue hover:bg-pipe-blue/20 disabled:opacity-50"
        >
          {importandoAdmin ? "Importando..." : "↗ Importar configurações do administrador"}
        </button>

        <form onSubmit={salvar} className="space-y-4 mt-6">
          <div className="flex items-center gap-4">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoUrl}
                alt="Logo da empresa"
                className="w-16 h-16 rounded-full object-cover border border-pipe-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-pipe-dark border border-pipe-border flex items-center justify-center text-2xl text-pipe-muted">
                🏢
              </div>
            )}

            <label className="cursor-pointer text-sm font-semibold text-pipe-blue hover:underline">
              {enviandoFoto
                ? "Enviando..."
                : fotoUrl
                  ? "Trocar foto/logo"
                  : "📷 Anexar foto ou logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={enviandoFoto}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) void enviarFoto(arquivo);
                }}
              />
            </label>
          </div>

          <input
            required
            placeholder="Nome da sua empresa"
            value={nomeEmpresa}
            onChange={(e) => setNomeEmpresa(e.target.value)}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Seu nome (ex.: Fernando)"
              value={nomeUsuario}
              onChange={(e) => setNomeUsuario(e.target.value)}
              className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
            />
            <input
              placeholder="Tempo de empresa (ex.: 8 anos)"
              value={tempoEmpresa}
              onChange={(e) => setTempoEmpresa(e.target.value)}
              className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
            />
          </div>

          <input
            placeholder="Área de atuação (ex.: Cibersegurança)"
            value={areaAtuacao}
            onChange={(e) => setAreaAtuacao(e.target.value)}
            onBlur={talvezBuscarSugestoes}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
          />

          <div>
            <select
              value={departamentoUso}
              onChange={(e) => setDepartamentoUso(e.target.value)}
              className={`w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none text-white ${
                departamentoUso ? "" : "text-pipe-muted/60"
              }`}
            >
              <option value="">
                Qual departamento usa seu produto? (opcional)
              </option>
              {DEPARTAMENTOS.map((departamento) => (
                <option key={departamento} value={departamento}>
                  {departamento}
                </option>
              ))}
            </select>

            <p className="text-pipe-muted/70 text-[11px] mt-1">
              💡 Ex.: um CRM é usado pelo Comercial — os alvos viram gerentes
              comerciais, SDRs e vendedores, não a TI. Isso deixa o ICP muito
              mais preciso.
            </p>
          </div>

          <input
            type="url"
            placeholder="Site da empresa (ex.: https://suaempresa.com.br)"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
          />

          <textarea
            required
            rows={5}
            placeholder={
              "O que sua empresa vende? Seja específico.\nEx.: Pentest, monitoramento de ameaças 24/7 (SOC), resposta a incidentes e adequação à LGPD para médias empresas."
            }
            value={produtosServicos}
            onChange={(e) => setProdutosServicos(e.target.value)}
            onBlur={talvezBuscarSugestoes}
            className="w-full bg-pipe-dark border border-pipe-border rounded-lg p-3 focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white resize-y"
          />

          <p className="text-pipe-muted text-xs">
            💡 Quanto mais concreto, melhores os e-mails: cite serviços,
            tipo de cliente e o problema que você resolve.
          </p>

          <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white">
                🎯 Especialidades e nichos
              </p>

              <button
                type="button"
                onClick={() => void buscarSugestoesNichos()}
                disabled={
                  buscandoNichos ||
                  (!areaAtuacao.trim() && !produtosServicos.trim())
                }
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-pipe-blue/15 border border-pipe-blue/40 text-pipe-blue hover:bg-pipe-blue/25 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap"
              >
                {buscandoNichos
                  ? "✨ Analisando..."
                  : sugestoesNichos.length > 0
                    ? "✨ Atualizar sugestões"
                    : "✨ Sugerir com IA"}
              </button>
            </div>

            <p className="text-pipe-muted text-xs mt-1 mb-2">
              {buscandoNichos
                ? "Analisando o que sua empresa vende..."
                : sugestoesNichos.length > 0
                  ? "Confirmamos os itens que você vende? Clique para marcar — nossa IA usa isso nos leads."
                  : "Preencha a área e o que você vende: as sugestões aparecem sozinhas aqui."}
            </p>

            {erroNichos && (
              <p className="text-yellow-400/90 text-xs mb-2">
                ⚠️ {erroNichos}
              </p>
            )}

            {(nichosEscolhidos.length > 0 ||
              sugestoesNichos.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Array.from(
                  new Set([...nichosEscolhidos, ...sugestoesNichos])
                ).map((nicho) => {
                  const escolhido = nichosEscolhidos.includes(nicho);
                  return (
                    <button
                      key={nicho}
                      type="button"
                      onClick={() => alternarNicho(nicho)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        escolhido
                          ? "bg-pipe-lime text-black border-pipe-lime font-semibold"
                          : "bg-pipe-card text-gray-300 border-pipe-border hover:border-pipe-blue hover:text-white"
                      }`}
                    >
                      {escolhido ? "✓ " : "+ "}
                      {nicho}
                    </button>
                  );
                })}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const alvo = e.currentTarget.elements.namedItem(
                  "nichoManualInput"
                ) as HTMLInputElement | null;
                if (alvo) {
                  adicionarNichoManual(alvo.value);
                  alvo.value = "";
                }
              }}
              className="flex gap-2"
            >
              <input
                name="nichoManualInput"
                placeholder="Ou digite um nicho (ex.: Escritórios de contabilidade)"
                className="flex-1 bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-xs focus:border-pipe-blue focus:outline-none placeholder:text-pipe-muted/60 text-white"
              />
              <button
                type="submit"
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-pipe-border text-gray-300 hover:text-white hover:border-pipe-blue transition"
              >
                Adicionar
              </button>
            </form>
          </div>

          <div className="bg-pipe-dark border border-pipe-border rounded-lg p-3">
            <p className="text-sm font-semibold text-white mb-1">
              📎 Portfólio (opcional)
            </p>

            <p className="text-pipe-muted text-xs mb-2">
              Anexe PDFs ou imagens (catálogo, apresentação, print de site).
              Nossa equipe lê o conteúdo e usa como contexto nas prospecções.
            </p>

            {anexos.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {anexos.map((anexo, indice) => (
                  <li
                    key={`${anexo.url}-${indice}`}
                    className="flex items-center justify-between gap-2 text-xs bg-pipe-card border border-pipe-border rounded-lg px-2.5 py-1.5"
                  >
                    <span className="truncate text-gray-300">
                      {anexo.tipo === "pdf" ? "📄" : "🖼️"} {anexo.nome}
                      <span className="text-pipe-muted">
                        {" "}
                        · lido ✓
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => removerAnexo(indice)}
                      className="shrink-0 text-red-400 hover:text-red-300"
                      title="Remover anexo"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="cursor-pointer inline-block text-xs font-semibold text-pipe-blue hover:underline">
              {enviandoAnexo
                ? "Lendo anexo..."
                : "＋ Anexar PDF ou imagem"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                disabled={enviandoAnexo}
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) void enviarAnexo(arquivo);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {erro && <p className="text-red-400 text-sm">{erro}</p>}

          <button
            type="submit"
            disabled={salvando || enviandoFoto}
            className="w-full bg-pipe-lime text-black font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            {salvando
              ? "Salvando..."
              : obrigatorio
                ? "Salvar e começar →"
                : "💾 Salvar alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}
