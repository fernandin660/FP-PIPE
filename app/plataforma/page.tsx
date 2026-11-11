import type { Metadata } from "next";
import Link from "next/link";
import Envelope from "../../components/studio/Envelope";
import BannerCookies from "../../components/studio/BannerCookies";
import { BarraTopo, CursorStudio, Revelar } from "../../components/studio/Interacoes";
import { DICIONARIOS } from "../../components/studio/dicionario";
import AvatarConsultor from "../../components/AvatarConsultor";
import { DEFINICAO_PLANOS as PLANOS } from "../../lib/planos";

export const metadata: Metadata = {
  title: "FP Pipe | Listas de Prospecção B2B, Contatos e Primeira Abordagem",
  description:
    "Encontre empresas com o perfil do seu cliente ideal, veja quem decide a compra e receba uma primeira abordagem pronta. Prospecção B2B no Brasil e nas Américas.",
  alternates: { canonical: "/plataforma" },
};

const passos = [
  {
    titulo: "Descreva o que você vende",
    texto:
      "Conte sua oferta no perfil e anexe o portfólio. A partir daí, o sistema monta o perfil de cliente ideal (ICP): segmentos-alvo, dores e os cargos envolvidos na compra.",
  },
  {
    titulo: "Veja as empresas por aderência",
    texto:
      "Cada empresa recebe um score de 0 a 100, com a justificativa ao lado. A lista já vem na ordem de quem você deve abordar primeiro — no Brasil e nas Américas.",
  },
  {
    titulo: "Pegue a primeira abordagem",
    texto:
      "Decisor e influenciador identificados, e-mail inicial escrito e telefone verificado quando disponível. Você edita, aprova e parte para a conversa.",
  },
];

const recursos = [
  {
    titulo: "Score por empresa, com justificativa",
    texto:
      "Cada empresa recebe uma nota de 0 a 100 e o motivo no mesmo lugar. O time sabe por onde começar, sem lista aleatória.",
  },
  {
    titulo: "Quem decide, por nome e cargo",
    texto: "Aprovador e influenciador da compra identificados. Acabou o e-mail genérico para “empresa”.",
  },
  {
    titulo: "Primeira abordagem já escrita",
    texto: "Cada empresa recebe um texto de abertura. Você ajusta, copia e envia — nada sai sem revisão.",
  },
  {
    titulo: "Contato comercial com verificação",
    texto:
      "Buscador de contatos, verificação de telefone e os dados consolidados de várias fontes em um só lugar.",
  },
  {
    titulo: "Playbook que fica de herança",
    texto: "Uma abordagem que gerou reunião vira modelo. Você reutiliza e melhora a cada rodada.",
  },
  {
    titulo: "CRM com cadência de follow-up",
    texto:
      "As empresas da lista viram cards no funil, com responsável, próxima atividade e sequência de contatos agendada.",
  },
];

const planos = [
  {
    chave: "silver" as const,
    itens: [
      "250 empresas em listas por mês",
      "Score 0–100 com justificativa",
      "Primeiras abordagens escritas (25/mês)",
      "Exportação em CSV",
      "1 usuário",
    ],
    faltam: ["Sem buscador de contatos", "Sem telefones verificados"],
  },
  {
    chave: "gold" as const,
    destaque: true,
    itens: [
      "400 empresas em listas por mês",
      "Buscador de contatos (até 400 buscas/mês)",
      "50 telefones verificados de decisores",
      "Primeiras abordagens escritas (100/mês)",
      "Envio em massa: 100 e-mails/dia",
      "3 usuários",
    ],
    faltam: [],
  },
  {
    chave: "platinum" as const,
    itens: [
      "1.000 empresas em listas por mês",
      "Buscador de contatos (até 1.000 buscas/mês)",
      "100 telefones verificados de decisores",
      "Primeiras abordagens escritas (300/mês)",
      "Envio em massa: 300 e-mails/dia",
      "6 usuários",
      "Prioridade na fila de geração",
    ],
    faltam: [],
  },
];

const perguntas = [
  {
    pergunta: "Preciso de cartão para testar?",
    resposta:
      "Não. A conta de teste inclui 1 lista com até 25 empresas. Cartão só é pedido quando você assina.",
  },
  {
    pergunta: "O que é o score?",
    resposta:
      "Uma nota de 0 a 100 que mede a aderência da empresa ao seu ICP, com a justificativa ao lado de cada nota.",
  },
  {
    pergunta: "Os textos saem prontos para enviar?",
    resposta: "Cada empresa recebe uma abordagem inicial escrita. Você revisa e edita antes de qualquer envio.",
  },
  {
    pergunta: "Funciona fora do Brasil?",
    resposta:
      "Sim. O teste já consulta empresas do Brasil e das Américas; nos planos internacionais você define o escopo de países.",
  },
];

function Marca() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M9 1.5 16.5 15H1.5Z" fill="#2442e5" />
      </svg>
      FP Pipe
    </span>
  );
}

function Check({ ok = true }: { ok?: boolean }) {
  return ok ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-1 shrink-0">
      <path d="m3 8.5 3.2 3L13 4.5" stroke="#2442e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-1 shrink-0">
      <path d="M4 8h8" stroke="#a3a3ab" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function PaginaPlataforma() {
  return (
    <Envelope idioma="pt-BR">
      <CursorStudio />
      <BannerCookies dic={DICIONARIOS.pt} idioma="pt" />

      <BarraTopo>
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-6 md:h-20 md:px-10">
          <Link href="/plataforma" aria-label="FP Pipe">
            <Marca />
          </Link>
          <nav aria-label="Menu" className="hidden items-center gap-8 text-sm text-[#4b4b53] lg:flex">
            <a href="#como-funciona" className="studio-link-nav">Como funciona</a>
            <a href="#recursos" className="studio-link-nav">Recursos</a>
            <a href="#planos" className="studio-link-nav">Planos</a>
            <a href="#perguntas" className="studio-link-nav">Perguntas</a>
            <Link href="/" className="studio-link-nav">Criação de sites</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="studio-link-nav px-2 text-sm font-medium">
              Entrar
            </Link>
            <Link href="/prospeccao" className="studio-botao !min-h-[44px] !px-5 !py-2.5 !text-sm">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </BarraTopo>

      <main>
        {/* HERO */}
        <section className="studio-container grid items-center gap-14 pb-20 pt-32 md:pt-44 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-32">
          <div>
            <p className="studio-selo mb-6">Prospecção B2B</p>
            <h1 className="studio-titulo-hero">Encontre as empresas certas para prospectar.</h1>
            <p className="mt-7 max-w-[46ch] text-lg leading-relaxed text-[#4b4b53] md:text-xl">
              A FP Pipe monta sua lista de empresas B2B, mostra quem decide a compra em cada uma e deixa a primeira
              abordagem escrita para você revisar. No Brasil e nas Américas.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/prospeccao" className="studio-botao">
                Criar conta grátis <span aria-hidden="true">→</span>
              </Link>
              <a href="#planos" className="studio-botao-fantasma">
                Ver planos
              </a>
            </div>
            <p className="mt-5 text-sm text-[#5e5e66]">Teste grátis sem cartão · 1 lista com até 25 empresas.</p>
          </div>

          <ExemploProduto />
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="studio-secao bg-[#ebe9e3]">
          <div className="studio-container">
            <Revelar>
              <p className="studio-selo mb-6">Como funciona</p>
              <h2 className="studio-titulo-secao">Três passos até a primeira lista</h2>
            </Revelar>
            <ol className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-8">
              {passos.map((p, i) => (
                <li key={p.titulo}>
                  <Revelar atraso={i * 90}>
                    <div className="border-t border-[#111114] pt-6">
                      <span className="studio-numero">0{i + 1}</span>
                      <h3 className="mt-6 text-xl font-medium tracking-tight">{p.titulo}</h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-[#4b4b53]">{p.texto}</p>
                    </div>
                  </Revelar>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* RECURSOS */}
        <section id="recursos" className="studio-secao">
          <div className="studio-container">
            <Revelar>
              <p className="studio-selo mb-6">Recursos</p>
              <h2 className="studio-titulo-secao">A lista é só o começo.</h2>
            </Revelar>
            <div className="mt-14 grid border-t border-[#111114] md:mt-20 md:grid-cols-2 lg:grid-cols-3">
              {recursos.map((r, i) => (
                <Revelar key={r.titulo} atraso={(i % 3) * 70}>
                  <div className="h-full border-b border-[#d6d4cd] py-8 md:pr-10">
                    <span className="text-sm tabular-nums text-[#5e5e66]">0{i + 1}</span>
                    <h3 className="mt-4 text-xl font-medium tracking-tight">{r.titulo}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-[#4b4b53]">{r.texto}</p>
                  </div>
                </Revelar>
              ))}
            </div>

            <Revelar>
              <ExemploFunil />
            </Revelar>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="studio-secao bg-[#ebe9e3]">
          <div className="studio-container">
            <Revelar>
              <p className="studio-selo mb-6">Planos</p>
              <h2 className="studio-titulo-secao">Escolha seu plano</h2>
              <p className="mt-5 max-w-[56ch] text-[#4b4b53]">
                O teste já entrega uma lista de até 25 empresas. No plano anual o valor por mês sai cerca de 20% menor
                e fica travado por 12 meses.
              </p>
            </Revelar>
            <div className="mt-14 grid gap-5 md:mt-20 lg:grid-cols-3">
              {planos.map((p, i) => {
                const def = PLANOS[p.chave];
                return (
                  <Revelar key={p.chave} atraso={i * 90}>
                    <div
                      className={`flex h-full flex-col rounded-[18px] border p-7 ${
                        p.destaque ? "border-[#111114] bg-[#111114] text-[#f4f3ef]" : "border-[#d6d4cd] bg-[#f4f3ef]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{def.nome}</h3>
                        {p.destaque && (
                          <span className="rounded-full bg-[#2442e5] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="mt-6 flex items-baseline gap-1">
                        <span className="text-5xl font-medium tracking-[-0.04em]">R$ {def.precoMensal}</span>
                        <span className={p.destaque ? "text-[#b9b9c0]" : "text-[#5e5e66]"}>/mês</span>
                      </p>
                      <p className={`mt-2 text-sm ${p.destaque ? "text-[#b9b9c0]" : "text-[#5e5e66]"}`}>
                        ou R$ {def.precoAnualPorMes}/mês no plano anual
                      </p>
                      <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                        {p.itens.map((item) => (
                          <li key={item} className="flex gap-3">
                            <Check />
                            <span>{item}</span>
                          </li>
                        ))}
                        {p.faltam.map((item) => (
                          <li key={item} className="flex gap-3 text-[#8a8a92]">
                            <Check ok={false} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/planos"
                        className={`mt-8 justify-center ${
                          p.destaque ? "studio-botao" : "studio-botao-fantasma"
                        }`}
                      >
                        Assinar {def.nome}
                      </Link>
                    </div>
                  </Revelar>
                );
              })}
            </div>
            <Revelar>
              <div className="mt-6 flex flex-col gap-4 rounded-[18px] border border-[#d6d4cd] p-7 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-medium">Internacional</h3>
                  <p className="mt-1 text-[15px] text-[#4b4b53]">
                    Para prospectar fora do Brasil, com escopo de países definido por você. A partir de R${" "}
                    {PLANOS.silver_intl.precoAnualPorMes}/mês no anual.
                  </p>
                </div>
                <Link href="/planos" className="studio-botao-fantasma shrink-0">
                  Ver planos internacionais
                </Link>
              </div>
            </Revelar>
          </div>
        </section>

        {/* PERGUNTAS */}
        <section id="perguntas" className="studio-secao">
          <div className="studio-container grid gap-12 md:grid-cols-[4fr_7fr] md:gap-20">
            <Revelar>
              <p className="studio-selo mb-6">Perguntas</p>
              <h2 className="studio-titulo-secao">Perguntas que ficam no caminho</h2>
            </Revelar>
            <Revelar atraso={120}>
              <div className="border-t border-[#111114]">
                {perguntas.map((p) => (
                  <details key={p.pergunta} className="group border-b border-[#d6d4cd]">
                    <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium tracking-tight [&::-webkit-details-marker]:hidden">
                      {p.pergunta}
                      <span
                        aria-hidden="true"
                        className="text-2xl font-light text-[#2442e5] transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="max-w-[60ch] pb-6 leading-relaxed text-[#4b4b53]">{p.resposta}</p>
                  </details>
                ))}
              </div>
            </Revelar>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="bg-[#111114] text-[#f4f3ef]">
          <div className="studio-container py-24 md:py-36">
            <Revelar>
              <h2 className="studio-titulo-secao max-w-[18ch] !text-[#f4f3ef]">Sua próxima lista pode sair hoje.</h2>
              <p className="mt-6 max-w-[52ch] text-lg text-[#b9b9c0]">
                No teste você monta uma lista, compara os scores e lê a primeira abordagem. Sem cartão para começar.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/prospeccao" className="studio-botao">
                  Criar conta grátis <span aria-hidden="true">→</span>
                </Link>
                <Link href="/login" className="studio-link-nav text-sm text-[#b9b9c0] hover:!text-white">
                  Já tem conta? Entrar
                </Link>
              </div>
            </Revelar>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d6d4cd]">
        <div className="studio-container flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <Marca />
            <p className="text-sm text-[#5e5e66]">
              © {new Date().getFullYear()} FP Pipe · Prospecção B2B — lista, contato e primeira abordagem.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link href="/" className="studio-link-nav">Criação de sites</Link>
            <Link href="/planos" className="studio-link-nav">Planos</Link>
            <Link href="/login" className="studio-link-nav">Entrar</Link>
            <Link href="/termos" className="studio-link-nav">Termos</Link>
            <Link href="/privacidade" className="studio-link-nav">Privacidade</Link>
          </div>
        </div>
      </footer>
      <AvatarConsultor />
    </Envelope>
  );
}

/** Ficha de empresa como aparece no produto (dados de exemplo). */
function ExemploProduto() {
  return (
    <figure className="relative">
      <div className="overflow-hidden rounded-[18px] border border-[#d6d4cd] bg-white shadow-[0_24px_60px_-30px_rgba(17,17,20,0.25)]">
        <div className="flex items-center justify-between border-b border-[#e9e7e1] px-5 py-3 text-xs text-[#6b6b72]">
          <span>Lista · Frigoríficos MT</span>
          <span>25 empresas</span>
        </div>
        <div className="p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-medium tracking-tight">Frigorífico Boi Forte LTDA</p>
              <p className="mt-1 text-sm text-[#5e5e66]">Cuiabá/MT · Grande porte</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-medium tracking-[-0.04em] text-[#2442e5]">92</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">score</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ecebe6]">
            <div className="h-full w-[92%] rounded-full bg-[#2442e5]" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#4b4b53]">
            Exporta carne bovina e passa por auditorias de origem: encaixa no seu ICP de rastreabilidade industrial.
          </p>

          <dl className="mt-6 grid gap-3 border-t border-[#e9e7e1] pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">Aprovador</dt>
              <dd className="mt-1 font-medium">Diretor de Produção</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">Influenciador</dt>
              <dd className="mt-1 font-medium">Gerente de Qualidade</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-[12px] bg-[#f4f3ef] p-4">
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">
              <span>Abordagem inicial</span>
              <span className="normal-case tracking-normal">Você edita antes de enviar</span>
            </div>
            <p className="mt-3 text-sm font-medium">Assunto: Rastreabilidade de lote no Boi Forte</p>
            <p className="mt-2 text-sm leading-relaxed text-[#4b4b53]">
              Olá, time do Boi Forte — frigoríficos que exportam precisam comprovar a origem de cada lote em
              auditoria. Faz sentido uma conversa rápida?
            </p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-[#5e5e66]">Exemplo do produto, com dados fictícios.</figcaption>
    </figure>
  );
}

/** Funil do CRM em miniatura (dados de exemplo). */
function ExemploFunil() {
  const colunas = [
    {
      nome: "Novo",
      cards: [
        { empresa: "Laticínios Serra Azul", score: 88, prox: "Enviar e-mail · hoje" },
        { empresa: "Transportes Vale Norte", score: 74, prox: "Sem atividade" },
      ],
    },
    {
      nome: "Em abordagem",
      cards: [{ empresa: "Frigorífico Boi Forte", score: 92, prox: "Ligar · amanhã" }],
    },
    {
      nome: "Reunião agendada",
      cards: [{ empresa: "Metalúrgica Aço Sul", score: 81, prox: "Reunião · quinta, 10h" }],
    },
  ];
  return (
    <figure className="mt-16 md:mt-24">
      <div className="overflow-hidden rounded-[18px] border border-[#d6d4cd] bg-white">
        <div className="flex items-center justify-between border-b border-[#e9e7e1] px-5 py-3 text-xs text-[#6b6b72]">
          <span>CRM · Funil de prospecção</span>
          <span>Cadência: Padrão 5 toques</span>
        </div>
        <div className="grid gap-4 bg-[#faf9f6] p-4 md:grid-cols-3 md:p-6">
          {colunas.map((c) => (
            <div key={c.nome}>
              <p className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-[0.1em] text-[#4b4b53]">
                {c.nome}
                <span className="tabular-nums text-[#8a8a92]">{c.cards.length}</span>
              </p>
              <div className="space-y-3">
                {c.cards.map((card) => (
                  <div key={card.empresa} className="rounded-[12px] border border-[#e3e1db] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium leading-snug">{card.empresa}</p>
                      <span className="rounded-full bg-[#eef1fe] px-2 py-0.5 text-xs font-medium tabular-nums text-[#2442e5]">
                        {card.score}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-[#5e5e66]">{card.prox}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-[#5e5e66]">
        O funil do CRM, com a próxima atividade de cada empresa. Dados fictícios.
      </figcaption>
    </figure>
  );
}
