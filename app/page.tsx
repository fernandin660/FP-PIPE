import Link from "next/link";
import AvatarConsultor from "../components/AvatarConsultor";
import LinkUsuario from "../components/LinkUsuario";
import {
  IconeAlvo,
  IconeBusca,
  IconeCadeado,
  IconeCartao,
  IconeEmail,
  IconeEmpresa,
  IconeEquipe,
  IconeEscrever,
  IconePasta,
  IconeSetaExterna,
  IconeTelefone,
  IconeVerificado,
} from "../components/Icones";

const passos = [
  {
    numero: "1",
    titulo: "Descreva o que você vende",
    descricao:
      "Conte sua oferta no perfil e anexe o portfólio. A partir daí, o sistema monta o perfil de cliente ideal (ICP): segmentos-alvo, dores e os cargos envolvidos na compra.",
  },
  {
    numero: "2",
    titulo: "Veja as empresas por aderência",
    descricao:
      "Cada empresa recebe um score de 0 a 100, com a justificativa ao lado. A lista já vem na ordem de quem você deve abordar primeiro — no Brasil e nas Américas.",
  },
  {
    numero: "3",
    titulo: "Pegue a primeira abordagem",
    descricao:
      "Decisor e influenciador identificados, e-mail inicial escrito e telefone verificado quando disponível. Você edita, aprova e parte para a conversa.",
  },
];

const diferenciais = [
  {
    icone: <IconeAlvo />,
    titulo: "Score por empresa, com justificativa",
    texto:
      "Cada empresa recebe uma nota de 0 a 100 e o motivo no mesmo lugar. O time sabe por onde começar, sem lista aleatória.",
  },
  {
    icone: <IconeEquipe />,
    titulo: "Quem decide, por nome e cargo",
    texto:
      "Aprovador e influenciador da compra identificados. Acabou o e-mail genérico para “empresa”.",
  },
  {
    icone: <IconeEscrever />,
    titulo: "Primeira abordagem já escrita",
    texto:
      "Cada empresa recebe um texto de abertura. Você ajusta, copia e envia — nada sai sem revisão.",
  },
  {
    icone: <IconeBusca />,
    titulo: "Contato comercial com verificação",
    texto:
      "Buscador de contatos, verificação de telefone e os dados consolidados de várias fontes em um só lugar.",
  },
  {
    icone: <IconePasta />,
    titulo: "Playbook que fica de herança",
    texto:
      "Uma abordagem que gerou reunião vira modelo. Você reutiliza e melhora a cada rodada.",
  },
  {
    icone: <IconeCartao />,
    titulo: "Teste antes de pagar",
    texto:
      "Conta gratuita, sem cartão, com 1 lista de até 25 empresas. Só decide comprar quando a lista fizer sentido.",
  },
];

const segmentosTicker = [
  "Indústrias",
  "Transportadoras",
  "Frigoríficos",
  "Clínicas",
  "Software houses",
  "Construtoras",
  "Metalúrgicas",
  "Distribuidoras",
  "Escritórios jurídicos",
  "Agronegócio",
  "Hotelaria",
  "Elétricas",
];

const fatos = [
  ["0–100", "score por empresa, com justificativa"],
  ["70M+", "de empresas na base pública de CNPJs"],
  ["Brasil + Américas", "no escopo das buscas"],
  ["R$ 0", "para testar: 1 lista com até 25 empresas"],
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
    resposta:
      "Cada empresa recebe uma abordagem inicial escrita. Você revisa e edita antes de qualquer envio.",
  },
  {
    pergunta: "Funciona fora do Brasil?",
    resposta:
      "Sim. O teste já consulta empresas do Brasil e das Américas; nos planos internacionais você define o escopo de países.",
  },
];

export default function Inicio() {
  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200 overflow-x-hidden">
      {/* ANÚNCIO DE LANÇAMENTO */}

      <div className="bg-pipe-lime text-black text-center text-sm py-2.5 px-4">
        Lançamento: plano Gold por R$ 227/mês no anual, preço travado por 12
        meses.{" "}
        <Link href="/planos" className="underline underline-offset-2 font-semibold">
          Ver condições
        </Link>
      </div>

      {/* NAV */}

      <header className="sticky top-0 z-40 backdrop-blur bg-pipe-bg/85 border-b border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl text-white">
            FP <span className="text-pipe-lime">Pipe</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-pipe-muted">
            <a href="#como-funciona" className="hover:text-white transition">
              Como funciona
            </a>
            <a href="#diferenciais" className="hover:text-white transition">
              Diferenciais
            </a>
            <a href="#planos" className="hover:text-white transition">
              Planos
            </a>
            <a href="#perguntas" className="hover:text-white transition">
              Perguntas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <LinkUsuario />
            <Link
              href="/planos"
              className="text-sm font-semibold text-white border border-pipe-border rounded-lg px-4 py-2 hover:border-pipe-blue transition hidden sm:block"
            >
              Ver planos
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

      {/* HERO */}

      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-14 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-pipe-blue border border-pipe-blue/30 bg-pipe-blue/10 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-pipe-blue" />
          Prospecção B2B
        </span>

        <h1 className="font-display text-5xl md:text-6xl leading-tight text-white mt-7 max-w-4xl mx-auto">
          Encontre as{" "}
          <span className="text-pipe-lime">empresas certas</span> para
          prospectar.
        </h1>

        <p className="text-pipe-muted text-lg mt-6 max-w-2xl mx-auto">
          A FP Pipe monta sua lista de empresas B2B, mostra quem decide a
          compra em cada uma e deixa a primeira abordagem escrita para você
          revisar. No Brasil e nas Américas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/prospeccao"
            className="bg-pipe-lime text-black font-bold text-lg rounded-xl px-9 py-4 hover:brightness-110 transition"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/planos"
            className="border border-pipe-border text-white font-semibold text-lg rounded-xl px-8 py-4 hover:border-pipe-blue hover:bg-pipe-card transition"
          >
            Ver planos
          </Link>
        </div>

        <p className="text-sm text-pipe-muted mt-5">
          Teste grátis sem cartão · 1 lista com até 25 empresas.
          <br />
          <Link href="/login" className="text-white font-semibold underline underline-offset-4 hover:text-pipe-lime transition">
            Já tem conta? Entrar
          </Link>
        </p>

        {/* EXEMPLO DO PRODUTO */}

        <div className="relative max-w-3xl mx-auto mt-14 h-72 hidden md:block">
          <span className="absolute -top-6 right-0 text-[10px] font-semibold uppercase tracking-wider text-pipe-muted/60 border border-pipe-border rounded-full px-2.5 py-0.5">
            Exemplo do produto
          </span>

          <div className="absolute left-0 top-0 w-80 bg-pipe-card border border-pipe-border rounded-xl p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm">
                Frigorífico Boi Forte LTDA
              </p>
              <span className="text-xs font-bold text-black bg-pipe-lime rounded-full px-2 py-0.5">
                92
              </span>
            </div>
            <p className="text-pipe-muted text-xs mt-1">
              Cuiabá/MT · Grande · Score justificado
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-gray-300">
              <p className="flex items-center gap-2">
                <IconeEmpresa className="w-3.5 h-3.5 text-pipe-blue shrink-0" />
                Aprovador: Diretor de Produção
              </p>
              <p className="flex items-center gap-2">
                <IconeEquipe className="w-3.5 h-3.5 text-pipe-blue shrink-0" />
                Influenciador: Gerente de Qualidade
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-pipe-blue bg-pipe-blue/10 border border-pipe-blue/30 rounded-full px-3 py-1">
              <IconeEmail className="w-3.5 h-3.5" />
              Abordagem inicial
            </span>
          </div>

          <div className="absolute right-6 top-24 w-96 bg-pipe-dark border border-pipe-lime/40 rounded-xl p-5 shadow-2xl text-left z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-pipe-lime/15 flex items-center justify-center text-pipe-lime">
                <IconeEmail className="w-4 h-4" />
              </span>
              <p className="text-white font-semibold text-sm">
                Abordagem inicial
              </p>
              <span className="ml-auto text-[10px] font-bold uppercase text-pipe-lime">
                Você edita antes de enviar
              </span>
            </div>
            <p className="text-xs text-pipe-blue font-medium">
              Assunto: Rastreabilidade de lote no Boi Forte
            </p>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Olá, time do Boi Forte — frigoríficos que exportam precisam
              comprovar a origem de cada lote em auditoria. Escrevi sobre a
              integração do módulo à linha de produção. Faz sentido uma
              conversa rápida?
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-black bg-pipe-lime rounded-md px-3 py-1.5 pointer-events-none">
                Revisar e copiar
              </span>
              <span className="text-[11px] text-pipe-muted">
                edita na ficha da empresa
              </span>
            </div>
          </div>

          <div className="absolute left-40 bottom-0 w-72 bg-pipe-card border border-pipe-lime/30 rounded-xl p-4 shadow-2xl text-left">
            <p className="flex items-center gap-2 text-xs text-pipe-muted">
              <IconeBusca className="w-3.5 h-3.5" />
              linkedin.com/in/ricardo-almeida-ti
            </p>
            <p className="text-sm text-white font-medium mt-1 truncate">
              ricardo.almeida@metalurgica-exemplo.com.br
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-lime-400 bg-lime-500/10 border border-lime-500/30 rounded-full px-3 py-1">
                <IconeVerificado className="w-3.5 h-3.5" />
                e-mail sugerido
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-black bg-pipe-blue rounded-full px-2 py-0.5">
                <IconeTelefone className="w-3 h-3" />
                Telefone verificado
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER DE SEGMENTOS */}

      <section className="border-y border-pipe-border bg-pipe-card/50 py-3.5 overflow-hidden">
        <div className="anim-ticker flex whitespace-nowrap w-max">
          {[...segmentosTicker, ...segmentosTicker].map((seg, i) => (
            <span
              key={`${seg}-${i}`}
              className="mx-6 text-sm text-pipe-muted font-medium"
            >
              {seg}
            </span>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}

      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-3xl md:text-4xl text-white text-center">
          Três passos até a primeira lista
        </h2>
        <p className="text-pipe-muted text-center mt-3 max-w-2xl mx-auto">
          Do perfil da sua empresa à primeira abordagem, sem reescrever nada
          do zero.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {passos.map((passo) => (
            <div
              key={passo.numero}
              className="bg-pipe-card border border-pipe-border rounded-xl p-6 hover:border-pipe-blue/50 transition"
            >
              <span className="w-10 h-10 rounded-lg bg-pipe-blue/15 text-pipe-blue font-bold flex items-center justify-center text-lg">
                {passo.numero}
              </span>
              <h3 className="text-white font-semibold text-lg mt-4">
                {passo.titulo}
              </h3>
              <p className="text-pipe-muted text-sm mt-2">{passo.descricao}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/prospeccao"
            className="inline-block bg-pipe-blue text-black font-bold rounded-xl px-8 py-3.5 hover:brightness-110 transition"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* FATOS */}

      <section className="max-w-6xl mx-auto px-6 pb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {fatos.map(([valor, rotulo]) => (
            <div
              key={rotulo}
              className="bg-pipe-card border border-pipe-border rounded-xl py-6 px-3"
            >
              <p className="font-display text-3xl md:text-4xl text-pipe-lime">
                {valor}
              </p>
              <p className="text-pipe-muted text-xs mt-1.5">{rotulo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DIFERENCIAIS */}

      <section id="diferenciais" className="max-w-6xl mx-auto px-6 py-16">
        <span className="inline-flex text-xs font-bold tracking-widest uppercase text-black bg-pipe-lime rounded-full px-4 py-1.5 mx-auto block w-fit">
          Diferenciais
        </span>

        <h2 className="font-display text-3xl md:text-5xl text-white text-center mt-6">
          A lista é só o começo.
        </h2>

        <p className="text-gray-300 text-center mt-5 max-w-2xl mx-auto text-lg">
          Achar CNPJ qualquer um acha. Saber quem abordar, com o quê e por quê
          é o trabalho. É para isso que a FP Pipe existe.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {diferenciais.map((item) => (
            <div
              key={item.titulo}
              className="bg-pipe-card border border-pipe-border rounded-xl p-6 hover:border-pipe-blue/60 transition"
            >
              <span className="w-11 h-11 rounded-lg bg-pipe-blue/12 border border-pipe-blue/25 flex items-center justify-center text-pipe-blue">
                {item.icone}
              </span>
              <h3 className="text-white font-semibold text-base mt-4">
                {item.titulo}
              </h3>
              <p className="text-gray-300 text-sm mt-2 leading-relaxed">
                {item.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANOS */}

      <section id="planos" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-3xl md:text-4xl text-white text-center">
          Escolha seu plano
        </h2>

        <p className="text-pipe-muted text-center mt-3 max-w-xl mx-auto">
          O teste já entrega uma lista de até 25 empresas. No plano anual o
          valor por mês sai ~20% menor e fica travado por 12 meses.
        </p>

        <div className="grid md:grid-cols-3 gap-5 mt-10 items-stretch">
          {/* SILVER */}
          <div className="bg-pipe-card border border-pipe-border rounded-2xl p-7 flex flex-col">
            <p className="text-sm font-bold text-gray-300">Silver</p>

            <p className="mt-4 text-white">
              <span className="font-display text-4xl font-bold">R$ 147</span>
              <span className="text-pipe-muted text-sm"> /mês</span>
              <span className="ml-2 text-xs font-bold text-pipe-lime bg-pipe-lime/10 border border-pipe-lime/30 rounded-full px-2 py-0.5">
                −20% no anual
              </span>
            </p>

            <ul className="text-sm text-gray-300 space-y-2.5 mt-6 flex-1">
              {[
                "250 empresas em listas por mês",
                "Score 0–100 com justificativa",
                "Primeiras abordagens escritas (25/mês)",
                "Exportação em CSV",
                "1 usuário",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-pipe-muted">
                <IconeCadeado className="w-4 h-4 shrink-0 mt-0.5" />
                Sem buscador de contatos
              </li>
              <li className="flex items-start gap-2.5 text-pipe-muted">
                <IconeCadeado className="w-4 h-4 shrink-0 mt-0.5" />
                Sem telefones verificados
              </li>
            </ul>

            <Link
              href="/planos"
              className="mt-7 text-center text-sm font-semibold border border-pipe-border text-white rounded-lg px-5 py-3 hover:border-pipe-blue transition"
            >
              Assinar Silver
            </Link>
          </div>

          {/* GOLD */}
          <div className="relative bg-pipe-card border-2 border-pipe-lime rounded-2xl p-7 flex flex-col md:-translate-y-3">
            <span className="absolute top-0 right-0 text-[10px] font-bold uppercase tracking-wide bg-pipe-lime text-black rounded-bl-xl px-3 py-1">
              Recomendado
            </span>

            <p className="text-sm font-bold text-pipe-lime">Gold</p>

            <p className="mt-4 text-white">
              <span className="font-display text-4xl font-bold">R$ 297</span>
              <span className="text-pipe-muted text-sm"> /mês</span>
              <span className="ml-2 text-xs font-bold text-pipe-lime bg-pipe-lime/10 border border-pipe-lime/30 rounded-full px-2 py-0.5">
                −24% no anual
              </span>
            </p>

            <ul className="text-sm text-gray-300 space-y-2.5 mt-6 flex-1">
              {[
                "400 empresas em listas por mês",
                "Buscador de contatos (até 400 buscas/mês)",
                "50 telefones verificados de decisores",
                "Primeiras abordagens escritas (100/mês)",
                "Envio em massa: 100 e-mails/dia",
                "3 usuários",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/planos"
              className="mt-7 text-center text-sm font-bold bg-pipe-lime text-black rounded-lg px-5 py-3 hover:brightness-110 transition"
            >
              Assinar Gold
            </Link>
          </div>

          {/* PLATINUM */}
          <div className="bg-pipe-card border border-pipe-border rounded-2xl p-7 flex flex-col">
            <p className="text-sm font-bold text-gray-300">Platinum</p>

            <p className="mt-4 text-white">
              <span className="font-display text-4xl font-bold">R$ 497</span>
              <span className="text-pipe-muted text-sm"> /mês</span>
              <span className="ml-2 text-xs font-bold text-pipe-blue bg-pipe-blue/10 border border-pipe-blue/30 rounded-full px-2 py-0.5">
                −22% no anual
              </span>
            </p>

            <ul className="text-sm text-gray-300 space-y-2.5 mt-6 flex-1">
              {[
                "1.000 empresas em listas por mês",
                "Buscador de contatos (até 1.000 buscas/mês)",
                "100 telefones verificados de decisores",
                "Primeiras abordagens escritas (300/mês)",
                "Envio em massa: 300 e-mails/dia",
                "6 usuários",
                "Prioridade na fila de geração",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <IconeVerificado className="w-4 h-4 text-pipe-lime shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/planos"
              className="mt-7 text-center text-sm font-semibold border border-pipe-border text-white rounded-lg px-5 py-3 hover:border-pipe-blue transition"
            >
              Assinar Platinum
            </Link>
          </div>
        </div>

        {/* INTERNACIONAL — STRIP */}

        <Link
          href="/planos"
          className="group block mt-5 bg-pipe-card border border-pipe-blue/40 hover:border-pipe-blue rounded-2xl p-6 transition"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <p className="flex items-center gap-2 font-display text-xl text-white whitespace-nowrap">
              <IconeEmpresa className="w-5 h-5 text-pipe-blue" />
              Internacional
            </p>
            <p className="text-sm text-pipe-muted flex-1">
              Brasil, América do Norte, Central e Sul nos planos
              internacionais, a partir de{" "}
              <span className="text-white font-semibold">
                R$ 157/mês no anual
              </span>
              .
            </p>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-pipe-blue group-hover:underline whitespace-nowrap">
              Ver planos internacionais
              <IconeSetaExterna className="w-4 h-4" />
            </span>
          </div>
        </Link>

        <p className="text-pipe-muted/60 text-xs text-center mt-6">
          Teste grátis sem cartão · 1 lista com até 25 empresas · cancele
          quando quiser.
        </p>
      </section>

      {/* PERGUNTAS FREQUENTES */}

      <section id="perguntas" className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="font-display text-3xl md:text-4xl text-white text-center">
          Perguntas que ficam no caminho
        </h2>

        <div className="mt-10 space-y-4">
          {perguntas.map((item) => (
            <div
              key={item.pergunta}
              className="bg-pipe-card border border-pipe-border rounded-xl p-6"
            >
              <h3 className="text-white font-semibold">{item.pergunta}</h3>
              <p className="text-pipe-muted text-sm mt-2 leading-relaxed">
                {item.resposta}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-4xl md:text-5xl text-white">
          Sua próxima lista pode sair{" "}
          <span className="text-pipe-lime">hoje</span>.
        </h2>

        <p className="text-pipe-muted mt-4 max-w-xl mx-auto text-lg">
          No teste você monta uma lista, compara os scores e lê a primeira
          abordagem. Sem cartão para começar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-9">
          <Link
            href="/prospeccao"
            className="bg-pipe-lime text-black font-bold text-lg rounded-xl px-9 py-4 hover:brightness-110 transition"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/planos"
            className="border border-pipe-border text-white font-semibold text-lg rounded-xl px-8 py-4 hover:border-pipe-blue transition"
          >
            Ver planos
          </Link>
        </div>

        <p className="text-sm text-pipe-muted mt-5">
          <Link href="/login" className="text-white font-semibold underline underline-offset-4 hover:text-pipe-lime transition">
            Já tem conta? Entrar
          </Link>
        </p>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-pipe-muted/60">
          <p>
            © {new Date().getFullYear()} FP Pipe · Prospecção B2B — lista,
            contato e primeira abordagem.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/planos" className="hover:text-white transition">
              Planos
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Entrar
            </Link>
            <Link href="/termos" className="hover:text-white transition">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-white transition">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>

      <AvatarConsultor />
    </main>
  );
}