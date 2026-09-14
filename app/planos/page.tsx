"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AvatarConsultor from "../../components/AvatarConsultor";
import {
  IconeEstrela,
  IconeGrafico,
  IconeLista,
  IconeSetaExterna,
  IconeVerificado,
} from "../../components/Icones";

type Ciclo = "mensal" | "anual";
type PlanoChave =
  | "silver"
  | "gold"
  | "platinum"
  | "silver_intl"
  | "gold_intl"
  | "platinum_intl";

const planos: Array<{
  chave: PlanoChave;
  nome: string;
  precoMensal: number;
  precoAnual: number;
  descricao: string;
  destaques?: boolean;
  selo?: string;
  grupo?: "nacional" | "internacional";
  itens: string[];
  cta: string;
}> = [
  {
    chave: "silver",
    nome: "Silver",
    precoMensal: 147,
    precoAnual: 117,
    descricao: "Para montar listas de empresas com score de aderência.",
    itens: [
      "250 empresas prontas por mês",
      "15 gerações de lista por mês",
      "ICP + score de aderência 0–100",
      "Fichas: CNPJ, porte, região",
      "25 abordagens por mês",
      "Exportação CSV para o CRM",
      "— Sem Buscador de contatos",
    ],
    cta: "Assinar Silver",
  },
  {
    chave: "gold",
    nome: "Gold",
    precoMensal: 297,
    precoAnual: 227,
    descricao: "Para quem prospecta e dispara campanhas toda semana.",
    destaques: true,
    selo: "Mais escolhido",
    itens: [
      "Tudo do Silver, mais:",
      "400 empresas prontas por mês",
      "40 gerações de lista por mês",
      "Buscador de contatos: 400 buscas/mês",
      "50 telefones verificados do decisor",
      "Disparo em massa: 100 e-mails/dia",
      "100 abordagens por mês",
      "Até 3 usuários na mesma conta",
    ],
    cta: "Assinar Gold",
  },
  {
    chave: "platinum",
    nome: "Platinum",
    precoMensal: 497,
    precoAnual: 387,
    descricao: "Volume alto para vender todos os dias.",
    itens: [
      "Tudo do Gold, mais:",
      "1.000 empresas prontas por mês",
      "90 gerações de lista por mês",
      "Buscador de contatos: 1.000 buscas/mês",
      "100 telefones verificados do decisor",
      "Disparo em massa: 300 e-mails/dia",
      "300 abordagens por mês",
      "Prioridade na fila + suporte prioritário",
      "Até 6 usuários na mesma conta",
    ],
    cta: "Assinar Platinum",
  },
  {
    chave: "silver_intl",
    nome: "Silver Internacional",
    precoMensal: 197,
    precoAnual: 157,
    descricao: "Empresas em toda a América com os recursos do Silver.",
    grupo: "internacional",
    itens: [
      "Tudo do Silver, mais:",
      "Empresas em qualquer país das Américas",
      "Nome, segmento, endereço e telefone*",
      "Site da empresa para abordagem direta",
      "Listas persistentes + exportação CSV",
    ],
    cta: "Assinar Silver Internacional",
  },
  {
    chave: "gold_intl",
    nome: "Gold Internacional",
    precoMensal: 397,
    precoAnual: 317,
    descricao: "E-mails verificados e primeiras abordagens em toda a América.",
    grupo: "internacional",
    itens: [
      "Tudo do Gold, mais:",
      "400 empresas por mês em qualquer país da América",
      "400 buscas de e-mail verificado por mês",
      "Primeiro e-mail redigido para cada empresa",
      "Contato extra raspado do site da empresa*",
    ],
    cta: "Assinar Gold Internacional",
  },
  {
    chave: "platinum_intl",
    nome: "Platinum Internacional",
    precoMensal: 697,
    precoAnual: 557,
    descricao: "Volume alto em toda a América, todos os dias.",
    grupo: "internacional",
    itens: [
      "Tudo do Platinum, mais:",
      "1.000 empresas/mês em toda a América",
      "1.000 buscas de e-mail verificado por mês",
      "Prioridade na geração de listas",
      "Suporte prioritário via WhatsApp",
    ],
    cta: "Assinar Platinum Internacional",
  },
];

const faq = [
  {
    pergunta: "O que o teste grátis inclui?",
    resposta:
      "Você cria a conta sem cartão e ganha 1 lista com até 25 empresas para explorar a plataforma — no Brasil e nos países das Américas: gera a lista, abre as fichas e testa abordagens escritas por IA. Para produzir mais listas ou enviar campanhas, escolha um plano.",
  },
  {
    pergunta: "Quem pode disparar e-mails em massa?",
    resposta:
      "O disparo em massa de campanhas está nos planos Gold (100 e-mails/dia) e Platinum (300 e-mails/dia). No teste e no Silver você gera empresas, abordagens e busca contatos; o envio real de campanhas parte do Gold.",
  },
  {
    pergunta: "Precisa de cartão de crédito para começar?",
    resposta:
      "Não. Você cria a conta, ganha créditos de teste e usa a plataforma — gera lista, busca contatos e recebe abordagens escritas por IA. Só assina se fizer sentido.",
  },
  {
    pergunta: "Como funciona a cobrança?",
    resposta:
      "No plano mensal a cobrança é exclusivamente no cartão de crédito, todo mês. No anual você paga uma vez só (com desconto) e pode usar cartão ou Pix — sem renovação automática surpresa.",
  },
  {
    pergunta: "O que são 'empresas prontas'?",
    resposta:
      "São empresas já filtradas pelo seu perfil de cliente ideal (ICP): CNPJ ativo, segmento certo, região certa e score de aderência de 0 a 100. Você abre a ficha e já tem contexto para vender.",
  },
  {
    pergunta: "As buscas de e-mail não usadas acumulam?",
    resposta:
      "Não — o saldo de buscas renova a cada ciclo contratado. No anual, o desconto vem do pagamento único por 12 meses.",
  },
  {
    pergunta: "Tem fidelidade?",
    resposta:
      "Não. No mensal, é só não renovar quando quiser parar. No anual vale a pena justamente pelo desconto, mas não há multa nem letra miúda.",
  },
];

function IconeDoPlano({ chave }: { chave: PlanoChave }) {
  const base = chave.replace("_intl", "");
  const cls = "w-6 h-6 text-pipe-lime";
  if (base === "gold") return <IconeEstrela className={cls} />;
  if (base === "platinum") return <IconeGrafico className={cls} />;
  return <IconeLista className={cls} />;
}

function CartaoPlano({
  plano,
  ciclo,
  carregando,
  aoAssinar,
  ehAdmin,
}: {
  plano: (typeof planos)[number];
  ciclo: Ciclo;
  carregando: PlanoChave | null;
  aoAssinar: (chave: PlanoChave) => void;
  ehAdmin: boolean;
}) {
  const preco = ciclo === "mensal" ? plano.precoMensal : plano.precoAnual;

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-7 border ${
        plano.destaques
          ? "bg-pipe-card border-pipe-lime/50 shadow-[0_0_32px_rgba(127,255,0,0.08)] md:-mt-3 md:mb-[-12px]"
          : "bg-pipe-card border-pipe-border"
      }`}
    >
      {plano.selo && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold tracking-wide uppercase bg-pipe-lime text-black rounded-full px-4 py-1">
          {plano.selo}
        </span>
      )}

      <h2 className="font-display text-xl text-white">
        <span className="inline-flex items-center gap-2">
          <IconeDoPlano chave={plano.chave} />
          {plano.nome}
        </span>
      </h2>
      <p className="text-pipe-muted text-sm mt-1 min-h-[40px]">
        {plano.descricao}
      </p>

      <div className="flex items-end gap-1 mt-5">
        <span className="font-display text-4xl text-white">R$ {preco}</span>
        <span className="text-pipe-muted text-sm mb-1">/mês</span>
      </div>

      {ciclo === "anual" && (
        <p className="text-pipe-muted/70 text-xs mt-1">
          R$ {(plano.precoAnual * 12).toLocaleString("pt-BR")} cobrados uma vez
          ao ano
        </p>
      )}

      <ul className="mt-6 space-y-2.5 text-sm flex-1">
        {plano.itens.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0 mt-0.5" />
            <span className="text-gray-300">{item}</span>
          </li>
        ))}
      </ul>

      {ehAdmin ? (
        <button
          onClick={() => aoAssinar(plano.chave)}
          disabled={carregando !== null}
          className={`mt-7 block w-full text-center font-semibold rounded-lg py-3 transition disabled:opacity-50 ${
            plano.destaques
              ? "bg-pipe-lime text-black hover:opacity-90"
              : "border border-pipe-border text-white hover:border-pipe-blue"
          }`}
        >
          {carregando === plano.chave ? "Abrindo pagamento..." : plano.cta}
        </button>
      ) : (
        <div className="mt-7 block w-full text-center font-semibold rounded-lg py-3 bg-gray-800 text-gray-400 border border-gray-700">
          Peça ao administrador
        </div>
      )}

      <p className="text-pipe-muted/60 text-[11px] text-center mt-2">
        {ciclo === "mensal"
          ? "Somente cartão de crédito"
          : "Cartão de crédito ou Pix"}
      </p>
    </div>
  );
}

export default function Planos() {
  const router = useRouter();

  const [ciclo, setCiclo] = useState<Ciclo>("anual");
  const [carregandoPlano, setCarregandoPlano] = useState<PlanoChave | null>(
    null
  );
  const [erro, setErro] = useState("");
  const [papel, setPapel] = useState<string | null>(null);
  const [avisoStatus, setAvisoStatus] = useState<{
    tipo: "ok" | "pendente" | "falhou";
    texto: string;
  } | null>(null);

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    const avisoStatusInicial:
      | { tipo: "ok" | "pendente" | "falhou"; texto: string }
      | null =
      status === "sucesso"
        ? {
            tipo: "ok",
            texto:
              "Pagamento aprovado. Estamos ativando seu plano — recarregue a página em alguns segundos.",
          }
        : status === "pendente"
          ? {
              tipo: "pendente",
              texto:
                "Pagamento pendente. Se foi Pix, aguarde a confirmação em alguns minutos.",
            }
          : status === "falhou"
            ? {
                tipo: "falhou",
                texto:
                  "O pagamento não foi concluído. Você pode tentar novamente quando quiser.",
              }
            : null;
    if (avisoStatusInicial) {
      queueMicrotask(() => setAvisoStatus(avisoStatusInicial));
    }

    // Verifica se é admin
    fetch("/api/org")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.papel) setPapel(d.papel); })
      .catch(() => {});
  }, []);

  async function assinar(planoChave: PlanoChave) {
    setErro("");
    setCarregandoPlano(planoChave);

    try {
      const resposta = await fetch("/api/checkout/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: planoChave, ciclo }),
      });

      if (resposta.status === 401) {
        router.push("/login?next=/planos");
        return;
      }

      const dados = await resposta.json();

      if (dados.urlPagamento) {
        window.location.href = dados.urlPagamento;
      } else {
        setErro(dados.erro || "Não foi possível iniciar o pagamento.");
      }
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregandoPlano(null);
    }
  }

  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200">
      {/* NAV */}

      <header className="sticky top-0 z-40 backdrop-blur bg-pipe-bg/85 border-b border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl text-white hover:opacity-90 transition"
          >
            FP <span className="text-pipe-lime">Pipe</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-pipe-muted hover:text-white transition hidden sm:block"
            >
              ← Voltar
            </Link>
            <Link
              href="/prospeccao"
              className="text-sm font-semibold text-black bg-pipe-lime rounded-lg px-4 py-2 hover:opacity-90 transition"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      {/* TOPO */}

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
        <h1 className="font-display text-4xl md:text-5xl text-white">
          Planos com o limite que você precisa{" "}
          <span className="text-pipe-lime">por mês</span>
        </h1>

        <p className="text-pipe-muted text-lg mt-4 max-w-2xl mx-auto">
          Teste grátis: 1 lista com até 25 empresas, sem cartão. Quando ver o
          resultado, escolha um plano — sem fidelidade e sem letra miúda.
        </p>

        {/* AVISO DE RETORNO DO PAGAMENTO */}

        {avisoStatus && (
          <p
            className={`mt-6 mx-auto max-w-xl text-sm rounded-lg border px-4 py-3 ${
              avisoStatus.tipo === "ok"
                ? "text-lime-300 bg-lime-500/10 border-lime-500/30"
                : avisoStatus.tipo === "pendente"
                  ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/30"
                  : "text-red-300 bg-red-500/10 border-red-500/30"
            }`}
          >
            {avisoStatus.texto}
          </p>
        )}

        {/* TOGGLE CICLO */}

        <div className="inline-flex items-center gap-2 mt-8 bg-pipe-card border border-pipe-border rounded-lg p-1">
          <button
            onClick={() => setCiclo("anual")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition ${
              ciclo === "anual"
                ? "bg-pipe-blue text-black"
                : "text-pipe-muted hover:text-white"
            }`}
          >
            Anual
            <span className="ml-2 text-xs font-bold text-lime-400">
              até -24%
            </span>
          </button>
          <button
            onClick={() => setCiclo("mensal")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition ${
              ciclo === "mensal"
                ? "bg-pipe-blue text-black"
                : "text-pipe-muted hover:text-white"
            }`}
          >
            Mensal
          </button>
        </div>

        {ciclo === "anual" ? (
          <p className="text-pipe-muted/70 text-xs mt-3">
            Cartão de crédito ou Pix · cobrança única por ano · sem renovação
            automática
          </p>
        ) : (
          <p className="text-pipe-muted/70 text-xs mt-3">
            Somente cartão de crédito · cancele quando quiser · troque para o
            anual e economize até 24%
          </p>
        )}
      </section>

      {/* ERRO GLOBAL */}

      {erro && (
        <p className="max-w-md mx-auto px-6 pb-4 -mt-4 text-red-400 text-sm text-center">
          {erro}
        </p>
      )}

      {/* CARDS */}

      <section className="max-w-6xl mx-auto px-6 pb-10 grid md:grid-cols-3 gap-6 items-stretch">
        {planos
          .filter((p) => p.grupo !== "internacional")
          .map((plano) => (
            <CartaoPlano
              key={plano.chave}
              plano={plano}
              ciclo={ciclo}
              carregando={carregandoPlano}
              aoAssinar={assinar}
              ehAdmin={papel === "admin"}
            />
          ))}
      </section>

      {/* INTERNACIONAL */}

      <div className="max-w-6xl mx-auto px-6 pb-5 text-center">
        <h2 className="font-display text-3xl text-white">
          <span className="inline-flex items-center gap-3">
            <IconeSetaExterna className="w-7 h-7 text-pipe-lime" /> Internacional
          </span>
        </h2>
        <p className="text-pipe-muted text-sm mt-2 max-w-2xl mx-auto">
          Os mesmos planos, com busca de empresas em{" "}
          <span className="text-white font-semibold">toda a América</span> —
          Norte, Central e Sul. Nome, segmento, endereço, telefone* e site da
          empresa.
        </p>
      </div>

      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6 items-stretch">
        {planos
          .filter((p) => p.grupo === "internacional")
          .map((plano) => (
            <CartaoPlano
              key={plano.chave}
              plano={plano}
              ciclo={ciclo}
              carregando={carregandoPlano}
              aoAssinar={assinar}
              ehAdmin={papel === "admin"}
            />
          ))}
      </section>

      <p className="max-w-4xl mx-auto px-6 pb-10 pt-4 text-center text-pipe-muted/60 text-[11px]">
        *Telefone e site conforme disponibilidade nos dados públicos do
        OpenStreetMap. E-mail de contato extraído do site da empresa quando
        disponível.
      </p>

      {/* COMPARATIVO RÁPIDO */}

      <section className="max-w-4xl mx-auto px-6 pb-8">
        <div className="bg-pipe-card border border-pipe-border rounded-2xl p-6 text-center">
          <p className="text-pipe-muted text-sm">
            No mercado, contatos B2B custam{" "}
            <span className="text-white font-semibold">
              R$ 1–6 por lead
            </span>{" "}
            e vêm sem abordagem escrita. Na FP Pipe,{" "}
            <span className="text-pipe-lime font-semibold">
              cada contato já sai com o primeiro e-mail redigido
            </span>{" "}
            e você{" "}
            <span className="text-white font-semibold">
              dispara a campanha inteira pelo Gold
            </span>{" "}
            — sem trocar de ferramenta.
          </p>
        </div>
      </section>

      {/* FAQ */}

      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="font-display text-3xl text-white text-center">
          Perguntas frequentes
        </h2>

        <div className="space-y-4 mt-10">
          {faq.map((item) => (
            <details
              key={item.pergunta}
              className="group bg-pipe-card border border-pipe-border rounded-xl p-5"
            >
              <summary className="cursor-pointer text-white font-medium list-none flex items-center justify-between gap-4">
                {item.pergunta}
                <span className="text-pipe-blue group-open:rotate-45 transition-transform text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="text-pipe-muted text-sm mt-3">{item.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-pipe-muted/60">
          <p>© FP Pipe — Inteligência comercial para quem vende B2B.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-white transition">
              Início
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Entrar
            </Link>
          </div>
        </div>
      </footer>

      <AvatarConsultor />
    </main>
  );
}
