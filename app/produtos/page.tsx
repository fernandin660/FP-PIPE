"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { IconeCaixa } from "../../components/Icones";

type ProdutoCadastro = {
  id: string;
  nome: string;
  criado_em: string;
};

type Msg = { tipo: "ok" | "erro"; texto: string } | null;

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<ProdutoCadastro[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  async function carregar() {
    try {
      const res = await fetch("/api/produtos");
      if (!res.ok) {
        const dados = await res.json().catch(() => null);
        throw new Error(dados?.erro ?? "Falha ao carregar produtos.");
      }
      const dados = await res.json();
      setProdutos(dados.produtos ?? []);
      setPodeEditar(dados.podeEditar === true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar produtos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => void carregar(), 0);
    return () => clearTimeout(id);
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome || salvando) return;
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({
          tipo: "erro",
          texto: dados?.erro ?? "Falha ao salvar o produto.",
        });
        return;
      }
      setNovoNome("");
      await carregar();
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de conexão." });
    } finally {
      setSalvando(false);
    }
  }

  async function salvarRenome(p: ProdutoCadastro) {
    const nome = editandoNome.trim();
    if (!nome || salvando) return;
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/produtos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, nome }),
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({
          tipo: "erro",
          texto: dados?.erro ?? "Falha ao renomear o produto.",
        });
        return;
      }
      setEditandoId(null);
      setEditandoNome("");
      await carregar();
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de conexão." });
    } finally {
      setSalvando(false);
    }
  }

  async function remover(p: ProdutoCadastro) {
    if (!confirm(`Remover "${p.nome}" dos produtos cadastrados?`)) return;
    try {
      const res = await fetch(`/api/produtos?id=${encodeURIComponent(p.id)}`, {
        method: "DELETE",
      });
      const dados = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({ tipo: "erro", texto: dados?.erro ?? "Falha ao remover." });
        return;
      }
      await carregar();
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de conexão." });
    }
  }

  if (carregando) {
    return (
      <main className="flex-1 flex items-center justify-center py-24">
        <p className="text-pipe-muted">Carregando...</p>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex-1 flex items-center justify-center py-24">
        <p className="text-red-400">{erro}</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/prospeccao"
        className="text-sm text-pipe-muted hover:text-white mb-6 inline-block"
      >
        ← Voltar ao painel
      </Link>

      <h1 className="font-display text-3xl text-white mb-2">Produtos</h1>
      <p className="text-pipe-muted mb-8">
        Cadastre os produtos ou serviços que você vende. Eles viram uma lista
        selecionável no CRM e no Dashboard, então cada lead registra o mesmo
        produto em vez de digitar um texto livre.
      </p>

      {podeEditar && (
        <form
          onSubmit={adicionar}
          className="flex flex-col sm:flex-row gap-3 mb-8"
        >
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do produto ou serviço"
            maxLength={120}
            className="flex-1 bg-pipe-card border border-pipe-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-pipe-muted focus:outline-none focus:border-pipe-blue"
          />
          <button
            type="submit"
            disabled={salvando || !novoNome.trim()}
            className="bg-pipe-lime text-pipe-bg font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition"
          >
            {salvando ? "Salvando..." : "Adicionar produto"}
          </button>
        </form>
      )}

      {!podeEditar && produtos.length > 0 && (
        <p className="text-sm text-pipe-muted mb-6">
          Somente o admin da equipe pode adicionar, renomear ou remover
          produtos.
        </p>
      )}

      {produtos.length === 0 ? (
        <div className="bg-pipe-card border border-pipe-border rounded-xl p-10 text-center">
          <IconeCaixa className="w-10 h-10 text-pipe-muted mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">
            Nenhum produto cadastrado
          </p>
          <p className="text-sm text-pipe-muted max-w-md mx-auto">
            {podeEditar
              ? "Adicione o primeiro produto acima para começar a padronizar o campo de produto dos leads."
              : "Peça para o admin da equipe cadastrar os produtos. Eles ficarão disponíveis aqui para o time."}
          </p>
        </div>
      ) : (
        <div className="bg-pipe-card/60 border border-pipe-border rounded-xl overflow-hidden">
          {produtos.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-pipe-border/50 last:border-b-0"
            >
              <IconeCaixa className="w-4 h-4 text-pipe-lime shrink-0" />
              {editandoId === p.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editandoNome}
                  onChange={(e) => setEditandoNome(e.target.value)}
                  maxLength={120}
                  className="flex-1 bg-pipe-bg border border-pipe-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-pipe-blue"
                />
              ) : (
                <span className="flex-1 text-white font-medium truncate">
                  {p.nome}
                </span>
              )}
              {podeEditar &&
                (editandoId === p.id ? (
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => {
                        void salvarRenome(p);
                      }}
                      disabled={salvando || !editandoNome.trim()}
                      className="text-xs text-pipe-lime hover:text-white disabled:text-pipe-muted font-semibold"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditandoId(null);
                        setEditandoNome("");
                      }}
                      className="text-xs text-pipe-muted hover:text-white font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => {
                        setEditandoId(p.id);
                        setEditandoNome(p.nome);
                      }}
                      className="text-xs text-pipe-blue hover:text-white font-semibold"
                    >
                      Renomear
                    </button>
                    <button
                      onClick={() => void remover(p)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Remover
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-sm font-medium z-50 ${
            msg.tipo === "ok"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {msg.texto}
        </div>
      )}
    </main>
  );
}