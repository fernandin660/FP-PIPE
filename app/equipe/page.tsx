"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Membro = {
  id: string;
  usuario_id: string | null;
  papel: string;
  status: string;
  email_convite: string | null;
  criado_em: string;
};

type OrgData = {
  orgId: string;
  papel: string;
  nome: string;
  totalMembros: number;
  usuariosInclusos: number;
  permiteConvidar: boolean;
  plano: string;
  planoNome: string;
  membros: Membro[];
};

function EquipeContent() {
  const searchParams = useSearchParams();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [emailConvite, setEmailConvite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(
    null
  );
  const [aceitandoConvite, setAceitandoConvite] = useState(false);

  useEffect(() => {
    // Se veio com ?convite=aceitar, tenta aceitar automaticamente
    if (searchParams.get("convite") === "aceitar") {
      aceitarConvite();
    } else {
      carregarOrg();
    }
  }, []);

  async function aceitarConvite() {
    setAceitandoConvite(true);
    try {
      const res = await fetch("/api/org/convite/aceitar", { method: "POST" });

      if (res.status === 401) {
        // Não logado → redireciona pra login com retorno automático
        window.location.href = "/login?next=" + encodeURIComponent("/equipe?convite=aceitar");
        return;
      }

      const dados = await res.json();

      if (res.ok) {
        setMsg({ tipo: "ok", texto: dados.mensagem ?? "Convite aceito!" });
        window.history.replaceState({}, "", "/equipe");
        await carregarOrg();
      } else {
        setMsg({ tipo: "erro", texto: dados.erro ?? "Falha ao aceitar convite." });
        await carregarOrg();
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de conexão ao aceitar convite." });
      await carregarOrg();
    } finally {
      setAceitandoConvite(false);
    }
  }

  async function carregarOrg() {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        setOrg(await res.json());
      }
    } catch {
      // ignora
    } finally {
      setCarregando(false);
    }
  }

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    if (!emailConvite.trim()) return;

    setEnviando(true);
    setMsg(null);

    try {
      const res = await fetch("/api/org/convite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailConvite.trim() }),
      });

      const dados = await res.json();

      if (!res.ok) {
        setMsg({ tipo: "erro", texto: dados.erro ?? "Falha ao enviar convite." });
        return;
      }

      setMsg({ tipo: "ok", texto: dados.mensagem ?? "Convite enviado!" });
      setEmailConvite("");
      carregarOrg();
    } catch {
      setMsg({ tipo: "erro", texto: "Erro de conexão." });
    } finally {
      setEnviando(false);
    }
  }

  async function removerMembro(membroId: string, email: string) {
    if (!confirm(`Remover ${email || "este membro"} da equipe?`)) return;

    try {
      const res = await fetch("/api/org/membros", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membroId }),
      });

      if (res.ok) {
        carregarOrg();
      } else {
        const dados = await res.json();
        alert(dados.erro ?? "Falha ao remover.");
      }
    } catch {
      alert("Erro de conexão.");
    }
  }

  if (carregando) {
    return (
      <main className="flex-1 flex items-center justify-center py-24">
        <p className="text-gray-400">Carregando...</p>
      </main>
    );
  }

  if (!org) {
    return (
      <main className="flex-1 flex items-center justify-center py-24">
        <p className="text-red-400">Erro ao carregar dados da equipe.</p>
      </main>
    );
  }

  const vagasRestantes = org.usuariosInclusos - org.totalMembros;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/prospeccao"
        className="text-sm text-gray-400 hover:text-white mb-6 inline-block"
      >
        ← Voltar ao painel
      </Link>

      <h1 className="font-display text-3xl text-white mb-2">
        Equipe
      </h1>
      <p className="text-gray-400 mb-8">
        {org.nome} · Plano {org.planoNome} · {org.totalMembros}/{org.usuariosInclusos} membro(s)
      </p>

      {/* Lista de membros */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Membros</h2>
        <div className="bg-gray-800/60 rounded-lg overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1fr_100px_110px_80px] gap-4 px-4 py-2.5 border-b border-gray-700 text-xs text-gray-400 font-medium uppercase tracking-wide">
            <span>E-mail</span>
            <span>Papel</span>
            <span>Convite</span>
            <span className="text-right">
              {org.papel === "admin" && org.permiteConvidar && vagasRestantes > 0 && (
                <button
                  onClick={() =>
                    document.getElementById("campo-convite")?.focus()
                  }
                  className="text-blue-400 hover:text-blue-300 normal-case tracking-normal font-semibold"
                >
                  + Adicionar
                </button>
              )}
              {org.papel === "admin" && !org.permiteConvidar && (
                <Link
                  href="/planos"
                  className="text-yellow-400 hover:text-yellow-300 normal-case tracking-normal font-semibold"
                >
                  + Adicionar (upgrade)
                </Link>
              )}
            </span>
          </div>
          {/* Linhas */}
          {org.membros.map((m) => (
            <div
              key={m.id}
              className="grid grid-cols-[1fr_100px_110px_80px] gap-4 items-center px-4 py-3 border-b border-gray-700/50 last:border-b-0"
            >
              <span className="text-white font-medium truncate">
                {m.email_convite ?? "(sem e-mail)"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                  m.papel === "admin"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {m.papel === "admin" ? "Admin" : "Membro"}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                  m.status === "ativo"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-orange-500/20 text-orange-300"
                }`}
              >
                {m.status === "ativo" ? "Aceito" : "Pendente"}
              </span>
              <div className="text-right">
                {m.papel !== "admin" && org.papel === "admin" && (
                  <button
                    onClick={() => removerMembro(m.id, m.email_convite ?? "")}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
          {/* Linha de convite */}
          {org.permiteConvidar && vagasRestantes > 0 && (
            <form
              onSubmit={convidar}
              className="grid grid-cols-[1fr_100px_110px_80px] gap-4 items-center px-4 py-3 border-t border-gray-700"
            >
              <input
                id="campo-convite"
                type="email"
                value={emailConvite}
                onChange={(e) => setEmailConvite(e.target.value)}
                placeholder="email@empresa.com"
                className="bg-transparent border-b border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 text-sm py-1"
                disabled={enviando}
              />
              <span className="text-xs text-gray-500">Membro</span>
              <span className="text-xs text-gray-500">—</span>
              <div className="text-right">
                <button
                  type="submit"
                  disabled={enviando || !emailConvite.trim()}
                  className="text-xs text-green-400 hover:text-green-300 disabled:text-gray-600 font-semibold"
                >
                  {enviando ? "..." : "Convidar"}
                </button>
              </div>
            </form>
          )}
        </div>
        {org.permiteConvidar && vagasRestantes > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {vagasRestantes} vaga(s) restante(s) no plano {org.planoNome}
          </p>
        )}
      </section>

      {/* Upgrade prompt */}
      {org.papel === "admin" && !org.permiteConvidar && org.plano !== "teste" && (
        <section className="bg-gray-800/40 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-300 mb-3">
            Seu plano <strong>{org.planoNome}</strong> inclui apenas 1 assento.
            Faça upgrade para Gold ou Platinum e adicione colaboradores.
          </p>
          <Link
            href="/planos"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2 rounded-lg transition"
          >
            Fazer upgrade do plano
          </Link>
        </section>
      )}

      {/* Upgrade prompt: vagas esgotadas */}
      {org.papel === "admin" && org.permiteConvidar && vagasRestantes <= 0 && (
        <section className="bg-gray-800/40 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-300 mb-3">
            Limite de assentos atingido ({org.usuariosInclusos}/{org.usuariosInclusos}).
          </p>
          <Link
            href="/planos"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2 rounded-lg transition"
          >
            Fazer upgrade do plano
          </Link>
        </section>
      )}

      {/* Teste upgrade prompt */}
      {org.plano === "teste" && (
        <section className="bg-gray-800/40 border border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-300 mb-3">
            A versão teste não permite adicionar colaboradores.
          </p>
          <Link
            href="/planos"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2 rounded-lg transition"
          >
            Ver planos disponíveis
          </Link>
        </section>
      )}

      {/* Mensagem */}
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

export default function EquipePage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center py-24">
          <p className="text-gray-400">Carregando...</p>
        </main>
      }
    >
      <EquipeContent />
    </Suspense>
  );
}
