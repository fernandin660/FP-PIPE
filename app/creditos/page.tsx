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

  useEffect(() => {
    (async () => {
      const supabase = criarClienteSupabase();
      if (!supabase) return;

      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao?.user) {
        router.replace("/login?next=/creditos");
        return;
      }

      const resultados = await Promise.all(
        MOEDAS_INICIAIS.map(async (moeda) => {
          const { data } = await supabase
            .from(moeda.tabela)
            .select("saldo")
            .maybeSingle();

          return { ...moeda, saldo: data?.saldo ?? 0 };
        })
      );

      setMoedas(resultados);
      setCarregando(false);
    })();
  }, []);

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
            <IconeCartao className="w-7 h-7 text-pipe-lime" /> Meus créditos
          </span>
        </h1>
          <p className="text-pipe-muted text-sm mt-1">
            Cada tipo de uso tem saldo próprio — você não mistura créditos de
            funções diferentes.
          </p>

          {carregando ? (
            <p className="text-pipe-muted text-sm mt-10">Carregando...</p>
          ) : (
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
