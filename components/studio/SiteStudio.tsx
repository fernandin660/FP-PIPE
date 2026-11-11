import Image from "next/image";
import Link from "next/link";
import HeroParticulas from "./HeroParticulas";
import FormularioContato from "./FormularioContato";
import Projetos from "./Projetos";
import BannerCookies, { BotaoGerenciarCookies } from "./BannerCookies";
import { BarraTopo, CursorStudio, Revelar } from "./Interacoes";
import { CONTATO, IDIOMAS, type Dicionario, type Idioma } from "./dicionario";

export function SeletorIdioma({ idioma, rotulo, caminho = "" }: { idioma: Idioma; rotulo: string; caminho?: string }) {
  return (
    <nav aria-label={rotulo} className="flex items-center rounded-full border border-[#d6d4cd] p-1 text-xs font-medium">
      {IDIOMAS.map((l) => (
        <Link
          key={l}
          href={`/${l}${caminho}`}
          hrefLang={l}
          lang={l}
          aria-current={l === idioma ? "page" : undefined}
          className={`rounded-full px-3 py-2 uppercase tracking-wider transition-colors ${
            l === idioma ? "bg-[#111114] text-[#f4f3ef]" : "text-[#4b4b53] hover:text-[#111114]"
          }`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}

export function Marca() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M9 1.5 16.5 15H1.5Z" fill="#2442e5" />
      </svg>
      FP Pipe <span className="font-normal text-[#5e5e66]">Studio</span>
    </span>
  );
}

function Selo({ children }: { children: React.ReactNode }) {
  return <p className="studio-selo mb-6">{children}</p>;
}

export default function SiteStudio({ dic, idioma }: { dic: Dicionario; idioma: Idioma }) {
  const sms = `sms:${CONTATO.telefone}?&body=${encodeURIComponent(dic.contato.smsTexto)}`;
  const links = [
    { href: "#services", texto: dic.nav.servicos },
    { href: "#methode", texto: dic.nav.metodo },
    { href: "#projets", texto: dic.nav.projetos },
    { href: "#studio", texto: dic.nav.estudio },
  ];

  return (
    <>
      <CursorStudio />

      <BarraTopo>
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-6 md:h-20 md:px-10">
          <a href="#" className="shrink-0" aria-label="FP Pipe Studio">
            <Marca />
          </a>
          <nav aria-label="Menu" className="hidden items-center gap-8 text-sm text-[#4b4b53] lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="studio-link-nav">
                {l.texto}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <SeletorIdioma idioma={idioma} rotulo={dic.nav.idioma} />
            <a href="#contact" className="studio-botao hidden !py-3 sm:inline-flex">
              {dic.nav.contato}
            </a>
          </div>
        </div>
      </BarraTopo>

      <main>
        <HeroParticulas dic={dic} />

        {/* Serviços */}
        <section id="services" className="studio-secao">
          <div className="studio-container">
            <Revelar>
              <Selo>{dic.servicos.selo}</Selo>
              <h2 className="studio-titulo-secao">{dic.servicos.titulo}</h2>
            </Revelar>
            <ul className="mt-14 border-t border-[#111114] md:mt-20">
              {dic.servicos.itens.map((item, i) => (
                <li key={item.titulo}>
                  <Revelar atraso={i * 60}>
                    <div className="studio-linha-servico group">
                      <span className="text-sm tabular-nums text-[#5e5e66]">0{i + 1}</span>
                      <h3 className="studio-nome-servico">{item.titulo}</h3>
                      <p className="max-w-[40ch] text-[15px] leading-relaxed text-[#4b4b53] md:text-base">{item.texto}</p>
                      <span className="studio-seta" aria-hidden="true">
                        →
                      </span>
                    </div>
                  </Revelar>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Método */}
        <section id="methode" className="studio-secao bg-[#ebe9e3]">
          <div className="studio-container">
            <Revelar>
              <Selo>{dic.metodo.selo}</Selo>
              <h2 className="studio-titulo-secao">{dic.metodo.titulo}</h2>
            </Revelar>
            <ol className="mt-14 grid gap-10 sm:grid-cols-2 md:mt-20 lg:grid-cols-4 lg:gap-8">
              {dic.metodo.passos.map((p, i) => (
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

        {/* Projetos-conceito */}
        <section id="projets" className="studio-secao">
          <div className="studio-container">
            <Revelar>
              <Selo>{dic.conceitos.selo}</Selo>
              <h2 className="studio-titulo-secao">{dic.conceitos.titulo}</h2>
              <p className="mt-5 max-w-[52ch] text-[#4b4b53]">{dic.conceitos.aviso}</p>
            </Revelar>
            <Projetos dic={dic} idioma={idioma} />
          </div>
        </section>

        {/* Estúdio */}
        <section id="studio" className="studio-secao pt-0">
          <div className="studio-container grid items-center gap-12 md:grid-cols-[5fr_6fr] md:gap-20">
            <Revelar>
              <figure>
                <div className="overflow-hidden rounded-[20px]">
                  <Image
                    src="/studio/fernando-larissa.jpg"
                    alt={dic.estudio.legendaFoto}
                    width={1100}
                    height={1650}
                    sizes="(max-width: 768px) 100vw, 42vw"
                    className="studio-foto h-auto w-full"
                  />
                </div>
                <figcaption className="mt-3 text-sm text-[#5e5e66]">{dic.estudio.legendaFoto}</figcaption>
              </figure>
            </Revelar>
            <Revelar atraso={120}>
              <Selo>{dic.estudio.selo}</Selo>
              <h2 className="studio-titulo-secao">{dic.estudio.titulo}</h2>
              {dic.estudio.paragrafos.map((t) => (
                <p key={t.slice(0, 20)} className="mt-6 max-w-[52ch] text-lg leading-relaxed text-[#3a3a41]">
                  {t}
                </p>
              ))}
            </Revelar>
          </div>
        </section>

        {/* Ponte com o FP Pipe */}
        <section className="bg-[#111114] text-[#f4f3ef]">
          <div className="studio-container py-24 md:py-36">
            <Revelar>
              <h2 className="studio-titulo-secao max-w-[20ch] !text-[#f4f3ef]">{dic.ponte.titulo}</h2>
              <p className="mt-6 max-w-[52ch] text-lg text-[#b9b9c0]">{dic.ponte.texto}</p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/" className="studio-botao">
                  {dic.ponte.botao} <span aria-hidden="true">↗</span>
                </Link>
                <span className="text-sm text-[#9a9aa3]">{dic.ponte.nota}</span>
              </div>
            </Revelar>
          </div>
        </section>

        {/* Contato */}
        <section id="contact" className="studio-secao">
          <div className="studio-container grid gap-14 md:grid-cols-[4fr_7fr] md:gap-20">
            <Revelar>
              <Selo>{dic.contato.selo}</Selo>
              <h2 className="studio-titulo-secao">{dic.contato.titulo}</h2>
              <p className="mt-5 max-w-[36ch] text-lg text-[#4b4b53]">{dic.contato.texto}</p>
              <div className="mt-10 border-t border-[#d6d4cd] pt-6">
                <p className="text-sm text-[#5e5e66]">{dic.contato.direto}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href={sms} className="studio-botao-fantasma">
                    {dic.contato.sms}
                  </a>
                  <a href={`tel:${CONTATO.telefone}`} className="studio-botao-fantasma">
                    {dic.contato.ligar}
                  </a>
                </div>
                <p className="mt-4 text-sm tabular-nums text-[#4b4b53]">Larissa · {CONTATO.telefoneVisivel}</p>
              </div>
            </Revelar>
            <Revelar atraso={120}>
              <FormularioContato dic={dic} idioma={idioma} />
            </Revelar>
          </div>
        </section>
      </main>

      <Rodape dic={dic} idioma={idioma} />
    </>
  );
}

export function Rodape({ dic, idioma }: { dic: Dicionario; idioma: Idioma }) {
  return (
    <footer className="border-t border-[#d6d4cd]">
      <BannerCookies dic={dic} idioma={idioma} />
      <div className="studio-container flex flex-col gap-8 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Marca />
          <p className="text-sm text-[#5e5e66]">
            © {new Date().getFullYear()} FP Pipe. {dic.rodape.direitos}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {CONTATO.instagram && (
            <a href={CONTATO.instagram} target="_blank" rel="noopener noreferrer" className="studio-link-nav">
              {dic.contato.instagram} <span aria-hidden="true">↗</span>
            </a>
          )}
          <Link href={`/${idioma}/mentions-legales`} className="studio-link-nav">
            {dic.rodape.mentions}
          </Link>
          <Link href={`/${idioma}/confidentialite`} className="studio-link-nav">
            {dic.rodape.privacidade}
          </Link>
          <BotaoGerenciarCookies rotulo={dic.cookies.gerenciar} />
          <SeletorIdioma idioma={idioma} rotulo={dic.nav.idioma} />
        </div>
      </div>
    </footer>
  );
}
