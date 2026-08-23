"use client";

import { useState } from "react";
import Link from "next/link";
import AvatarConsultor from "../../components/AvatarConsultor";

type Ciclo = "mensal" | "anual";

const planos = [
  {
    nome: "Grátis",
    precoMensal: 0,
    precoAnual: 0,
    descricao: "Para conhecer a plataforma de verdade.",
    destaques: false,
    itens: [
      "5 créditos para desbloquear leads",
      "ICP completo gerado por IA",
      "Perfil da sua empresa + portfólio",
      "Score 0–100 das empresas encontradas",
      "Sem cartão de crédito",
    ],
    cta: "Criar conta grátis",
    porLead: null as string | null,
  },
  {
    nome: "Fundador",
    precoMensal: 147,
    precoAnual: 117,
    descricao: "Preço travado pra sempre · vagas limitadas.",
    destaques: true,
    itens: [
      "10 listas por mês (até 500 leads)",
      "✉️ E-mail pronto por lead — assunto + mensagem personalizados",
      "📎 Portfólio ilimitado: a IA lê seus PDFs e imagens",
      "Listas persistentes com ficha completa do lead",
      "Exportação CSV",
      "= R$ 0,29 por lead com e-mail pronto",
    ],
    cta: "Quero ser Fundador →",
    porLead: "R$ 0,29/lead",
  },
  {
    nome: "Pro",
    precoMensal: 347,
    precoAnual: 277,
    descricao: "Para quem prospecta todos os dias.",
    destaques: false,
    itens: [
      "Tudo do Fundador, mais:",
      "30 listas por mês (até 1.500 leads)",
      "Prioridade na geração de listas",
      "Suporte prioritário via WhatsApp",
      "= R$ 0,23 por lead com e-mail pronto",
    ],
    cta: "Assinar o Pro →",
    porLead: "R$ 0,23/lead",
  },
];

const faq = [
  {
    pergunta: "Precisa de cartão de crédito para começar?",
    resposta:
      "Não. Você cria a conta, ganha 5 créditos e testa tudo de verdade — inclusive o e-mail pronto. Só assina se fizer sentido.",
  },
  {
    pergunta: "O que significa 'preço travado pra sempre'?",
    resposta:
      "Os planos Fundador são limitados aos primeiros assinantes. Quem entra nesse preço mantém ele mesmo quando a tabela subir — é nossa forma de recompensar quem confiou primeiro.",
  },
  {
    pergunta: "Como funciona o e-mail pronto?",
    resposta:
      "Para cada empresa da sua lista, a IA escreve assunto + mensagem citando o nome da empresa, a dor do segmento dela e a oferta do SEU negócio — lendo até seu portfólio anexado. O texto fica editável na ficha do lead.",
  },
  {
    pergunta: "Tem fidelidade?",
    resposta:
      "Não. Mensal é cancelável quando quiser. No anual você paga uma vez e economiza ~20%, sem renovação automática surpresa.",
  },
];

export default function Planos() {
  const [ciclo, setCiclo] = useState<Ciclo>("anual");

  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200">
      {/* NAV */}

      <header className="sticky top-0 z-40 backdrop-blur bg-pipe-bg/85 border-b border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-2xl text-white hover:opacity-90 transition"
          >
            FP <span className="text-pipe-lime">PIPE</span>
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
          Planos que cabem no{" "}
          <span className="text-pipe-lime">seu funil</span>
        </h1>

        <p className="text-pipe-muted text-lg mt-4 max-w-2xl mx-auto">
          Comece grátis. Quando ver o resultado, escolha um plano — sem
          fidelidade e com preço honesto por lead.
        </p>

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
              -20%
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
            Cobrança única por ano · mais de 2 meses grátis · sem renovação
            automática
          </p>
        ) : (
          <p className="text-pipe-muted/70 text-xs mt-3">
            Prefere pagar mês a mês? Troque pro anual e economize 20% a
            qualquer momento.
          </p>
        )}
      </section>

      {/* CARDS */}

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6 items-stretch">
        {planos.map((plano) => {
          const preco =
            ciclo === "mensal" ? plano.precoMensal : plano.precoAnual;

          return (
            <div
              key={plano.nome}
              className={`relative flex flex-col rounded-2xl p-7 border ${
                plano.destaques
                  ? "bg-pipe-card border-pipe-lime/50 shadow-[0_0_32px_rgba(127,255,0,0.08)] md:-mt-3 md:mb-[-12px]"
                  : "bg-pipe-card border-pipe-border"
              }`}
            >
              {plano.destaques && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold tracking-wide uppercase bg-pipe-lime text-black rounded-full px-4 py-1">
                  ⭐ Vagas limitadas
                </span>
              )}

              <h2 className="font-display text-xl text-white">{plano.nome}</h2>
              <p className="text-pipe-muted text-sm mt-1 min-h-[40px]">
                {plano.descricao}
              </p>

              <div className="flex items-end gap-1 mt-5">
                <span className="font-display text-4xl text-white">
                  {preco === 0 ? "R$ 0" : `R$ ${preco}`}
                </span>
                <span className="text-pipe-muted text-sm mb-1">/mês</span>
              </div>

              {ciclo === "anual" && plano.precoAnual > 0 && (
                <p className="text-pipe-muted/70 text-xs mt-1">
                  R$ {(plano.precoAnual * 12).toLocaleString("pt-BR")} cobrados
                  uma vez ao ano
                </p>
              )}

              {plano.porLead && (
                <span className="inline-block mt-3 w-fit text-xs font-semibold text-pipe-blue bg-pipe-blue/10 border border-pipe-blue/30 rounded-full px-3 py-1">
                  ≈ {plano.porLead} com e-mail pronto
                </span>
              )}

              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                {plano.itens.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-pipe-lime mt-0.5">✓</span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/prospeccao"
                className={`mt-7 block text-center font-semibold rounded-lg py-3 transition ${
                  plano.destaques
                    ? "bg-pipe-lime text-black hover:opacity-90"
                    : "border border-pipe-border text-white hover:border-pipe-blue"
                }`}
              >
                {plano.cta}
              </Link>
            </div>
          );
        })}
      </section>

      {/* COMPARATIVO RÁPIDO */}

      <section className="max-w-4xl mx-auto px-6 pb-8">
        <div className="bg-pipe-card border border-pipe-border rounded-2xl p-6 text-center">
          <p className="text-pipe-muted text-sm">
            No mercado, contatos B2B custam{" "}
            <span className="text-white font-semibold">
              R$ 1–6 por lead
            </span>{" "}
            nas plataformas do segmento — e vêm sem e-mail escrito. No FP
            Pipe,{" "}
            <span className="text-pipe-lime font-semibold">
              cada lead já sai com o primeiro e-mail redigido
            </span>{" "}
            conectando sua oferta à dor dele.
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
