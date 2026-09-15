"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { criarClienteSupabase } from "../../lib/supabase/client";
import {
  IconeBusca,
  IconeCartao,
  IconeEscrever,
  IconeLista,
  IconeTelefone,
} from "../../components/Icones";

type Moeda = {
  chave: "listas" | "buscador" | "telefone" | "abordagens";
  nome: string;
  descricao: string;
  tabela: string;
  saldo: number | null;
};

type MembroOrg = {
  id: string;
  email_convite: string | null;
  papel: string;
  status: string;
  limite_listas: number | null;
  limite_buscador: number | null;
  limite_telefone: number | null;
  limite_ia: number | null;
};

type OrgInfo = {
  plano: string;
  planoNome: string;
  papel: string;
  membros: MembroOrg[];
};

const MOEDAS_INICIAIS: Moeda[] = [
  {
    chave: "listas",
    nome: "Créditos de listas",
    descricao:
      "Use na Nova prospecção para gerar listas de empresas com score de aderência.",
    tabela: "creditos",
    saldo: null,
  },
  {
    chave: "buscador",
    nome: "Créditos de buscador",
    descricao:
      "Cada busca de e-mail verificado gasta 1 crédito. Contatos já buscados saem do cache sem custo para você.",
    tabela: "creditos_contatos",
    saldo: null,
  },
  {
    chave: "telefone",
    nome: "Créditos de telefone",
    descricao:
      "Cada telefone verificado gasta 1 crédito. Gold inclui 50 telefones e Platinum 100 telefones.",
    tabela: "creditos_telefone",
    saldo: null,
  },
  {
    chave: "abordagens",
    nome: "Créditos de abordagem",
    descricao:
      "Gera e-mail, WhatsApp e mensagem de LinkedIn escritos para cada contato.",
    tabela: "creditos_ia",
    saldo: null,
  },
];

function IconeMoeda({ chave }: { chave: Moeda["chave"] }) {
  const cls = "w-5 h-5 text-pipe-lime";
  switch (chave) {
    case "listas":
      return <IconeLista className={cls} />;
    case "buscador":
      return <IconeBusca className={cls} />;
    case "telefone":
      return <IconeTelefone className={cls} />;
    case "abordagens":
      return <IconeEscrever className={cls} />;
  }
}

export default function PaginaCreditos() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [moedas, setMoedas] = useState<Moeda[]>(MOEDAS_INICIAIS);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [salvandoMembroId, setSalvandoMembroId] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao?.user) {
        router.replace("/login?next=/creditos");
        return;
      }

      const [resultadosRes, orgRes] = await Promise.all([
        Promise.all(
          MOEDAS_INICIAIS.map(async (moeda) => {
            const { data } = await supabase
              .from(moeda.tabela)
              .select("saldo")
              .maybeSingle();

            return { ...moeda, saldo: data?.saldo ?? 0 };
          })
        ),
        fetch("/api/org").then((res) => (res.ok ? res.json() : null)),
      ]);

      setMoedas(resultadosRes);
      if (orgRes) setOrg(orgRes);
      setCarregando(false);
    })();
  }, []);

  async function atualizarLimiteMembro(membroId: string, campo: string, valor: string) {
    const num = valor === "" ? null : Math.max(0, parseInt(valor, 10) || 0);
    setSalvandoMembroId(membroId);
    setMensagemSucesso("");

    try {
      const res = await fetch("/api/org/membros/limites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membroId,
          [campo]: num,
        }),
      });

      const dados = await res.json();
      if (res.ok) {
        setOrg((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            membros: prev.membros.map((m) =>
              m.id === membroId ? { ...m, [campo]: num } : m
            ),
          };
        });
        setMensagemSucesso("Limites atualizados com sucesso.");
        setTimeout(() => setMensagemSucesso(""), 3000);
      } else {
        alert(dados.erro ?? "Falha ao atualizar limite.");
      }
    } catch {
      alert("Erro de conexão ao atualizar limite.");
    } finally {
      setSalvandoMembroId(null);
    }
  }

  const planoEhGoldOuPlatinum =
    org &&
    (org.plano.toLowerCase().includes("gold") ||
      org.plano.toLowerCase().includes("platinum"));

  const isAdmin = org && org.papel === "admin";

  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/prospeccao"
          className="text-xs text-pipe-muted hover:text-white transition"
        >
          ← Voltar
        </Link>

        <h1 className="font-display text-3xl text-white mt-3">
          <span className="inline-flex items-center gap-3">
            <IconeCartao className="w-7 h-7 text-pipe-lime" /> Gerenciar créditos
          </span>
        </h1>
        <p className="text-pipe-muted text-sm mt-1">
          Cada tipo de uso tem saldo próprio. Nos planos Gold e Platinum, você pode gerenciar o pool compartilhado e atribuir cotas por membro.
        </p>

        {carregando ? (
          <p className="text-pipe-muted text-sm mt-10">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {moedas.map((moeda) => (
                <div
                  key={moeda.chave}
                  className="bg-pipe-card border border-pipe-border rounded-xl p-5 flex flex-col"
                >
                  <p className="text-xs font-semibold text-pipe-muted flex items-center gap-2">
                    <IconeMoeda chave={moeda.chave} />
                    {moeda.nome}
                  </p>

                  <p className="font-display text-4xl text-white mt-3">
                    {moeda.saldo ?? 0}
                  </p>

                  <p className="text-[11px] text-pipe-muted leading-relaxed mt-2 flex-1">
                    {moeda.descricao}
                  </p>
                </div>
              ))}
            </div>

            {/* Gestão de Créditos por Membro para Admins de Gold/Platinum */}
            {planoEhGoldOuPlatinum && isAdmin && (
              <div className="mt-12 bg-pipe-card border border-pipe-border rounded-2xl p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-display text-xl text-white">
                      Atribuição de Créditos por Membro ({org.planoNome})
                    </h2>
                    <p className="text-xs text-pipe-muted mt-0.5">
                      Defina o teto mensal que cada membro pode consumir do pool compartilhado da organização. Deixe em branco para uso livre.
                    </p>
                  </div>
                  {mensagemSucesso && (
                    <span className="text-xs text-pipe-lime font-semibold">
                      ✓ {mensagemSucesso}
                    </span>
                  )}
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="text-left text-pipe-muted border-b border-pipe-border text-xs">
                        <th className="pb-3 px-3">Membro</th>
                        <th className="pb-3 px-3">Listas</th>
                        <th className="pb-3 px-3">Buscador</th>
                        <th className="pb-3 px-3">Telefones</th>
                        <th className="pb-3 px-3">IA / Abordagens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pipe-border/60">
                      {org.membros.map((membro) => (
                        <tr key={membro.id} className="hover:bg-pipe-card/60">
                          <td className="py-3 px-3 text-white">
                            {membro.email_convite || "Membro"}
                            {membro.papel === "admin" && (
                              <span className="ml-2 text-[10px] bg-pipe-blue/20 text-pipe-blue px-2 py-0.5 rounded-full font-bold">
                                Admin
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              placeholder="Ilimitado"
                              defaultValue={membro.limite_listas ?? ""}
                              onBlur={(e) =>
                                atualizarLimiteMembro(membro.id, "limite_listas", e.target.value)
                              }
                              className="w-24 bg-pipe-bg border border-pipe-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pipe-blue"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              placeholder="Ilimitado"
                              defaultValue={membro.limite_buscador ?? ""}
                              onBlur={(e) =>
                                atualizarLimiteMembro(membro.id, "limite_buscador", e.target.value)
                              }
                              className="w-24 bg-pipe-bg border border-pipe-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pipe-blue"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              placeholder="Ilimitado"
                              defaultValue={membro.limite_telefone ?? ""}
                              onBlur={(e) =>
                                atualizarLimiteMembro(membro.id, "limite_telefone", e.target.value)
                              }
                              className="w-24 bg-pipe-bg border border-pipe-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pipe-blue"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              placeholder="Ilimitado"
                              defaultValue={membro.limite_ia ?? ""}
                              onBlur={(e) =>
                                atualizarLimiteMembro(membro.id, "limite_ia", e.target.value)
                              }
                              className="w-24 bg-pipe-bg border border-pipe-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pipe-blue"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {salvandoMembroId && (
                  <p className="text-xs text-pipe-muted mt-3">Salvando alteração…</p>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-10 bg-pipe-card border border-pipe-border rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-white">
              Precisa de mais créditos?
            </p>
            <p className="text-pipe-muted text-xs mt-1">
              Os planos Gold e Platinum incluem buscas de e-mail todo mês.
            </p>
          </div>

          <Link
            href="/planos"
            className="relative overflow-hidden anim-shine bg-pipe-lime text-black font-bold text-sm rounded-lg px-6 py-3 hover:brightness-110 transition shrink-0"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </main>
  );
}
