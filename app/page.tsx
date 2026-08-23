import Link from "next/link";
import AvatarConsultor from "../components/AvatarConsultor";

const passos = [
  {
    numero: "1",
    titulo: "Conte o que você vende",
    descricao:
      "Preencha seu perfil de empresa e anexe seu portfólio (PDF ou imagem). Nossa equipe lê o conteúdo e entende sua oferta.",
  },
  {
    numero: "2",
    titulo: "A IA desenha seu cliente ideal",
    descricao:
      "Em menos de 1 minuto você recebe o ICP completo: segmentos-alvo, quem decide a compra e as principais dores.",
  },
  {
    numero: "3",
    titulo: "Ache o decisor e ataque",
    descricao:
      "A lista vem priorizada por score — e cada lead recebe e-mail institucional da Receita, telefone do Google Maps e o e-mail VERIFICADO do decisor direto do LinkedIn.",
  },
];

const diferenciais = [
  {
    icone: "✉️",
    titulo: "E-mail pronto para cada lead",
    texto:
      "Assunto + mensagem citando o nome da empresa e a dor do segmento dela. Editável na ficha do lead. Nenhum concorrente brasileiro entrega isso.",
    destaque: true,
  },
  {
    icone: "🔎",
    titulo: "E-mail verificado do decisor em 1 clique",
    texto:
      "Cole o perfil do LinkedIn de qualquer tomador e receba o e-mail validado com nome, cargo e empresa. Perfil repetido? Resposta instantânea, sem custo. Isso é munição de verdade.",
    destaque: true,
  },
  {
    icone: "🤖",
    titulo: "Sales Copilot multicanal",
    texto:
      "Escolha produto, objetivo e canal (e-mail, LinkedIn, WhatsApp ou ligação): a IA entrega o MELHOR ARGUMENTO e o texto pronto, usando o cargo real do seu alvo.",
  },
  {
    icone: "🏢",
    titulo: "3 fontes de contato por lead",
    texto:
      "Receita Federal + Google Maps + Anymail Finder, somadas no mesmo dossiê. Fonte nova não apaga a antiga: quanto mais consultas, mais completo o lead.",
  },
  {
    icone: "🧠",
    titulo: "ICP desenhado em minutos",
    texto:
      "Responda 4 perguntas simples e receba o perfil completo do cliente ideal: tipos de empresa, decisores, influenciadores e dores.",
  },
  {
    icone: "🏆",
    titulo: "Score 0–100 com justificativa",
    texto:
      "Cada empresa recebe uma nota de aderência explicada. Você gasta energia só com quem realmente combina com o que você vende.",
  },
  {
    icone: "👥",
    titulo: "Dossiê completo de influenciadores",
    texto:
      "Vários contatos por lead, cada um com múltiplos e-mails e telefones — vindos do buscador, do LinkedIn ou cadastrados à mão. Exporta em CSV pronto pro CRM.",
  },
  {
    icone: "⭐",
    titulo: "Modelos que aprendem com você",
    texto:
      "Abordagem que converteu virou modelo? Salve e reutilize em qualquer lead. Seu playbook comercial se constrói sozinho.",
  },
  {
    icone: "🔒",
    titulo: "Comece grátis, pague pelo valor",
    texto:
      "Crie a conta e ganhe créditos para testar de verdade: gerar listas, buscar contatos e gerar abordagens. Sem cartão de crédito.",
  },
];

const segmentosTicker = [
  "🏭 Indústrias",
  "🚛 Transportadoras",
  "🥩 Frigoríficos",
  "🏥 Clínicas",
  "💻 Software houses",
  "🏗️ Construtoras",
  "🔧 Metalúrgicas",
  "📦 Distribuidoras",
  "⚖️ Escritórios jurídicos",
  "🌾 Agronegócio",
  "🏨 Hotelaria",
  "🔌 Elétricas",
];

export default function Inicio() {
  return (
    <main className="min-h-screen bg-pipe-bg text-gray-200 overflow-x-hidden">
      {/* BARRA DE URGÊNCIA */}

      <div className="bg-pipe-lime text-black text-center text-sm font-bold py-2.5 px-4">
        🔥{" "}
        <span className="uppercase tracking-wide">
          Preço Fundador a partir de R$ 117/mês — travado pra sempre
        </span>{" "}
        · vagas limitadas{" "}
        <Link href="/planos" className="underline underline-offset-2 ml-1">
          garantir minha vaga →
        </Link>
      </div>

      {/* NAV */}

      <header className="sticky top-0 z-40 backdrop-blur bg-pipe-bg/85 border-b border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <p className="font-display text-2xl text-white">
            FP <span className="text-pipe-lime">PIPE</span>
          </p>

          <nav className="hidden md:flex items-center gap-8 text-sm text-pipe-muted">
            <a href="#como-funciona" className="hover:text-white transition">
              Como funciona
            </a>
            <a href="#diferenciais" className="hover:text-white transition">
              Diferenciais
            </a>
            <Link href="/planos" className="hover:text-white transition">
              Planos
            </Link>
          </nav>

          <div className="flex items-center gap-3">
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
          <span className="w-2 h-2 rounded-full bg-pipe-blue animate-pulse" />
          Inteligência comercial B2B com IA
        </span>

        <h1 className="font-display text-5xl md:text-6xl leading-tight text-white mt-7 max-w-4xl mx-auto">
          Listas certas, e-mail escrito,{" "}
          <span className="text-pipe-lime">decisor encontrado</span> — tudo
          antes do seu café.
        </h1>

        <p className="text-pipe-muted text-lg mt-6 max-w-2xl mx-auto">
          Empresas priorizadas por score de aderência, o primeiro e-mail já
          personalizado e o <span className="text-white font-semibold">e-mail
          verificado do decisor</span> direto do LinkedIn. Prospecção B2B sem
          trabalho manual.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/planos"
            className="relative overflow-hidden anim-shine anim-cta-pulse bg-pipe-lime text-black font-bold text-lg rounded-xl px-9 py-4 hover:brightness-110 transition"
          >
            Ver planos →
          </Link>
          <Link
            href="/prospeccao"
            className="border border-pipe-border text-white font-semibold text-lg rounded-xl px-8 py-4 hover:border-pipe-blue hover:bg-pipe-card transition"
          >
            Testar grátis com 5 créditos
          </Link>
        </div>

        <p className="text-pipe-muted/60 text-xs mt-4">
          Sem cartão · sem fidelidade · resultado na primeira sessão
        </p>

        {/* DEMO FLUTUANTE */}

        <div className="relative max-w-3xl mx-auto mt-14 h-72 hidden md:block">
          <span className="absolute -top-6 right-0 text-[10px] font-semibold uppercase tracking-wider text-pipe-muted/60 border border-pipe-border rounded-full px-2.5 py-0.5">
            ✨ exemplo ilustrativo
          </span>
          <div
            className="anim-float absolute left-0 top-0 w-80 bg-pipe-card border border-pipe-border rounded-xl p-5 shadow-2xl text-left"
            style={{ ["--rot" as string]: "-2deg" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm">
                Frigorífico Boi Forte LTDA
              </p>
              <span className="text-xs font-bold text-black bg-pipe-lime rounded-full px-2 py-0.5">
                92
              </span>
            </div>
            <p className="text-pipe-muted text-xs mt-1">
              Cuiabá/MT · Grande · Score justificado ✓
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-gray-300">
              <p>👤 Aprovador: Diretor de Produção</p>
              <p>🎯 Influenciador: Gerente de Qualidade</p>
            </div>
            <span className="inline-block mt-3 text-xs font-semibold text-pipe-blue bg-pipe-blue/10 border border-pipe-blue/30 rounded-full px-3 py-1">
              ✉️ E-mail pronto
            </span>
          </div>

          <div
            className="anim-float absolute right-6 top-24 w-96 bg-pipe-dark border border-pipe-lime/40 rounded-xl p-5 shadow-2xl text-left z-10"
            style={{ ["--rot" as string]: "1.5deg", ["--delay" as string]: ".8s" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-pipe-lime/15 flex items-center justify-center text-sm">
                ✉️
              </span>
              <p className="text-white font-semibold text-sm">
                E-mail gerado pela IA agora
              </p>
              <span className="ml-auto text-[10px] font-bold uppercase text-pipe-lime animate-pulse">
                ● ao vivo
              </span>
            </div>
            <p className="text-xs text-pipe-blue font-medium">
              Assunto: Rastreabilidade de lote no Boi Forte
            </p>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Olá, time do Boi Forte — frigoríficos que exportam precisam provar
              a origem de cada lote em auditoria. Nosso módulo de rastreabilidade
              conecta a linha de produção ao selo digital...
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button className="text-xs font-semibold text-black bg-pipe-lime rounded-md px-3 py-1.5 pointer-events-none">
                📋 Copiar e enviar
              </button>
              <span className="text-[11px] text-pipe-muted">
                editável na ficha do lead
              </span>
            </div>
          </div>

          <div
            className="anim-float absolute left-40 bottom-0 w-72 bg-pipe-card border border-pipe-lime/30 rounded-xl p-4 shadow-2xl text-left"
            style={{ ["--rot" as string]: "-1deg", ["--delay" as string]: "1.6s" }}
          >
            <p className="text-xs text-pipe-muted">
              🔎 linkedin.com/in/ricardo-almeida-ti
            </p>
            <p className="text-sm text-white font-medium mt-1 truncate">
              ricardo.almeida@metalurgica-exemplo.com.br
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-lime-400 bg-lime-500/10 border border-lime-500/30 rounded-full px-3 py-1">
                ✓ e-mail verificado
              </span>
              <span className="text-[10px] font-bold uppercase text-black bg-pipe-blue rounded-full px-2 py-0.5 animate-pulse">
                ⚡ instantâneo
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

      {/* NÚMEROS */}

      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            ["70M+", "de empresas"],
            ["3 fontes", "de caça ao contato"],
            ["R$ 0,29", "por lead com e-mail pronto"],
            ["4 canais", "de abordagem gerados por IA"],
          ].map(([valor, rotulo]) => (
            <div
              key={rotulo}
              className="bg-pipe-card border border-pipe-border rounded-xl py-6 px-3 hover:border-pipe-blue/50 transition"
            >
              <p className="font-display text-3xl md:text-4xl text-pipe-lime">
                {valor}
              </p>
              <p className="text-pipe-muted text-xs mt-1.5">{rotulo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}

      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="font-display text-3xl md:text-4xl text-white text-center">
          Do zero à prospecção em 3 passos
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {passos.map((passo) => (
            <div
              key={passo.numero}
              className="bg-pipe-card border border-pipe-border rounded-xl p-6 hover:border-pipe-blue/50 hover:-translate-y-1 transition duration-200"
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
            Começar meu teste grátis →
          </Link>
        </div>
      </section>

      {/* DIFERENCIAIS */}

      <section id="diferenciais" className="relative max-w-6xl mx-auto px-6 py-16">
        {/* Brilhos de fundo */}
        <div className="pointer-events-none absolute -top-20 left-1/4 w-96 h-96 rounded-full bg-pipe-lime/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-pipe-blue/10 blur-[120px]" />

        <span className="relative inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-black bg-pipe-lime rounded-full px-4 py-1.5 mx-auto block w-fit">
          ⚡ O que ninguém mais entrega
        </span>

        <h2 className="relative font-display text-3xl md:text-5xl text-white text-center mt-6">
          Encontrar empresas é commodity.
          <br />
          <span className="text-pipe-lime">O que fazemos depois, não.</span>
        </h2>

        <p className="relative text-gray-300 text-center mt-5 max-w-2xl mx-auto text-lg">
          Todo mundo busca nos mesmos lugares. O jogo muda quando a
          lista sai{" "}
          <span className="text-white font-semibold">pronta pra vender</span>.
        </p>

        {/* DUO EXCLUSIVO */}

        <div className="relative grid md:grid-cols-2 gap-6 mt-12">
          {diferenciais.slice(0, 2).map((item) => (
            <div
              key={item.titulo}
              className="rounded-2xl p-[2px] bg-gradient-to-br from-pipe-lime/70 via-pipe-border to-pipe-blue/70 shadow-[0_0_40px_rgba(127,255,0,0.08)] hover:shadow-[0_0_60px_rgba(127,255,0,0.18)] transition duration-300"
            >
              <div className="rounded-2xl bg-pipe-dark p-8 h-full relative overflow-hidden">
                <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-black bg-pipe-lime rounded-full px-3 py-1">
                  exclusivo fp pipe
                </span>

                <span className="w-14 h-14 rounded-xl bg-pipe-lime/15 border border-pipe-lime/30 flex items-center justify-center text-3xl">
                  {item.icone}
                </span>

                <h3 className="text-white font-bold text-2xl mt-5">
                  {item.titulo}
                </h3>
                <p className="text-gray-300 text-base mt-3 leading-relaxed">
                  {item.texto}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* DEMAIS DIFERENCIAIS */}

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {diferenciais.slice(2).map((item) => (
            <div
              key={item.titulo}
              className="bg-pipe-card border border-pipe-border rounded-xl p-6 hover:border-pipe-blue/60 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,191,255,0.12)] transition duration-200"
            >
              <span className="w-11 h-11 rounded-lg bg-pipe-blue/12 border border-pipe-blue/25 flex items-center justify-center text-2xl">
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

        <div className="relative text-center mt-12">
          <Link
            href="/planos"
            className="relative inline-block overflow-hidden anim-shine anim-cta-pulse bg-pipe-lime text-black font-bold text-lg rounded-xl px-9 py-4 hover:brightness-110 transition"
          >
            Quero esses diferenciais trabalhando pra mim →
          </Link>
        </div>
      </section>

      {/* BLOCO FUNDADOR — ESCASSEZ */}

      <section className="max-w-4xl mx-auto px-6 py-14">
        <div className="anim-glow relative bg-pipe-card border-2 rounded-2xl p-8 md:p-10 text-center overflow-hidden">
          <span className="absolute top-0 right-0 text-xs font-bold uppercase tracking-wide bg-pipe-lime text-black rounded-bl-xl px-4 py-1.5">
            vagas limitadas
          </span>

          <h2 className="font-display text-3xl md:text-4xl text-white">
            Plano Fundador:{" "}
            <span className="text-pipe-lime">R$ 117/mês</span> no anual.
          </h2>

          <p className="text-pipe-muted mt-3 max-w-xl mx-auto">
            Os primeiros assinantes travam este preço mesmo quando a tabela
            subir. 10 listas por mês, 500 leads com e-mail pronto —{" "}
            <span className="text-white font-semibold">
              R$ 0,29 por lead
            </span>
            .
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link
              href="/planos"
              className="relative overflow-hidden anim-shine bg-pipe-lime text-black font-bold text-lg rounded-xl px-9 py-4 hover:brightness-110 transition"
            >
              Garantir meu preço fundador →
            </Link>
            <Link
              href="/prospeccao"
              className="border border-pipe-border text-white font-semibold text-lg rounded-xl px-8 py-4 hover:border-pipe-blue transition"
            >
              Antes quero testar grátis
            </Link>
          </div>

          <p className="text-pipe-muted/60 text-xs mt-5">
            ✓ Sem fidelidade &nbsp;·&nbsp; ✓ Mensal: R$ 147 &nbsp;·&nbsp;
            ✓ Cancele quando quiser
          </p>
        </div>
      </section>

      {/* COMPARATIVO */}

      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-pipe-card border border-pipe-border rounded-2xl p-8">
          <h2 className="font-display text-2xl md:text-3xl text-white text-center">
            Quanto custa um lead pronto?
          </h2>

          <table className="w-full mt-8 text-sm">
            <thead>
              <tr className="text-pipe-muted text-left">
                <th className="pb-3 font-medium">Tipo de plataforma</th>
                <th className="pb-3 font-medium">Custo por lead</th>
                <th className="pb-3 font-medium">E-mail escrito?</th>
                <th className="pb-3 font-medium">Contato verificado?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pipe-border">
              <tr>
                <td className="py-3 text-pipe-muted">
                  Dados B2B tradicionais
                </td>
                <td className="py-3">R$ 3–6 por contato desbloqueado</td>
                <td className="py-3 text-pipe-muted">Não</td>
                <td className="py-3 text-pipe-muted">Não</td>
              </tr>
              <tr>
                <td className="py-3 text-pipe-muted">
                  Plataformas com score IA
                </td>
                <td className="py-3">~R$ 1 por lead</td>
                <td className="py-3 text-pipe-muted">Não</td>
                <td className="py-3 text-pipe-muted">Não</td>
              </tr>
              <tr className="bg-pipe-blue/5">
                <td className="py-3 font-semibold text-pipe-blue">
                  FP Pipe · plano Fundador
                </td>
                <td className="py-3 font-semibold text-white">
                  R$ 0,29 por lead
                </td>
                <td className="py-3 font-semibold text-pipe-lime">
                  ✓ Personalizado por empresa
                </td>
                <td className="py-3 font-semibold text-pipe-lime">
                  ✓ Receita + Maps + LinkedIn
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-pipe-muted/70 text-xs mt-6">
            Faixas de preço baseadas em valores públicos de plataformas do
            segmento, verificados em ago/2026. Custo por lead do plano
            Fundador: R$ 147 ÷ até 500 leads mensais.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-4xl md:text-5xl text-white">
          Sua próxima lista pode estar pronta{" "}
          <span className="text-pipe-lime">hoje</span>.
        </h2>

        <p className="text-pipe-muted mt-4 max-w-xl mx-auto text-lg">
          Cada dia sem prospecção é um cliente que seu concorrente atendeu
          primeiro. Aqui, sua lista, o e-mail e o contato do decisor saem no
          mesmo dia.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-9">
          <Link
            href="/prospeccao"
            className="relative overflow-hidden anim-shine anim-cta-pulse bg-pipe-lime text-black font-bold text-lg rounded-xl px-9 py-4 hover:brightness-110 transition"
          >
            Criar conta grátis agora →
          </Link>
          <Link
            href="/planos"
            className="border border-pipe-border text-white font-semibold text-lg rounded-xl px-8 py-4 hover:border-pipe-blue transition"
          >
            Ver planos
          </Link>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-pipe-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-pipe-muted/60">
          <p>© FP Pipe — Inteligência comercial para quem vende B2B.</p>
          <div className="flex items-center gap-6">
            <Link href="/planos" className="hover:text-white transition">
              Planos
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
