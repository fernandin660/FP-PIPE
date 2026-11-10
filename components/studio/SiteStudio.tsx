import Image from "next/image";
import Link from "next/link";
import HeroParticulas from "./HeroParticulas";
import FormularioContato from "./FormularioContato";
import { BarraTopo, CartaoInclinavel, CursorStudio, Revelar } from "./Interacoes";
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
            <div className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-6">
              {dic.conceitos.projetos.map((p, i) => (
                <Revelar key={p.nome} atraso={i * 110}>
                  <figure>
                    <CartaoInclinavel>
                      <MiniSite variante={i} nome={p.nome} frase={p.frase} botao={p.botao} />
                    </CartaoInclinavel>
                    <figcaption className="mt-5 flex items-start justify-between gap-4">
                      <span>
                        <span className="block text-lg font-medium tracking-tight">{p.nome}</span>
                        <span className="text-sm text-[#5e5e66]">{p.setor}</span>
                      </span>
                      <span className="studio-etiqueta">{dic.conceitos.etiqueta}</span>
                    </figcaption>
                  </figure>
                </Revelar>
              ))}
            </div>
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
          <SeletorIdioma idioma={idioma} rotulo={dic.nav.idioma} />
        </div>
      </div>
    </footer>
  );
}

/** Mini-sites fictícios feitos em código, cada um com identidade própria. */
function MiniSite({ variante, nome, frase, botao }: { variante: number; nome: string; frase: string; botao: string }) {
  const temas = [
    { fundo: "#f1e4d0", texto: "#3b2412", destaque: "#b5562b", fonte: "Georgia, 'Times New Roman', serif" },
    { fundo: "#14213d", texto: "#f5f1e8", destaque: "#c9a24a", fonte: "Georgia, 'Times New Roman', serif" },
    { fundo: "#e6e6e3", texto: "#141414", destaque: "#141414", fonte: "inherit" },
  ];
  const t = temas[variante];
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#d6d4cd] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-1.5 border-b border-[#e3e1db] px-3 py-2.5" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-[#d6d4cd]" />
        <span className="h-2 w-2 rounded-full bg-[#d6d4cd]" />
        <span className="h-2 w-2 rounded-full bg-[#d6d4cd]" />
      </div>
      <div className="relative aspect-[4/3.4] overflow-hidden p-5" style={{ background: t.fundo, color: t.texto, fontFamily: t.fonte }}>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] opacity-80">
          <span>{nome}</span>
          <span className="flex gap-3">
            <span>—</span>
            <span>—</span>
          </span>
        </div>

        {variante === 0 && (
          <>
            <div className="absolute -bottom-10 -right-8 h-44 w-44 rounded-full" style={{ background: "#d9a86c" }} aria-hidden="true">
              <span className="absolute left-8 top-14 h-1.5 w-20 rotate-[-18deg] rounded-full" style={{ background: "#b97d3f" }} />
              <span className="absolute left-12 top-24 h-1.5 w-20 rotate-[-18deg] rounded-full" style={{ background: "#b97d3f" }} />
            </div>
            <p className="relative mt-10 max-w-[11ch] text-[26px] leading-[1.05] italic">{frase}</p>
          </>
        )}
        {variante === 1 && (
          <>
            <span className="mt-10 block h-px w-10" style={{ background: t.destaque }} aria-hidden="true" />
            <p className="mt-4 max-w-[13ch] text-[26px] leading-[1.1]">{frase}</p>
            <div className="absolute bottom-5 right-5 grid grid-cols-3 gap-1.5 opacity-30" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, k) => (
                <span key={k} className="h-6 w-6 border" style={{ borderColor: t.destaque }} />
              ))}
            </div>
          </>
        )}
        {variante === 2 && (
          <>
            <p className="mt-8 max-w-[10ch] text-[30px] font-light leading-[1] tracking-tight">{frase}</p>
            <div className="absolute bottom-0 right-0 flex items-end gap-2 p-5" aria-hidden="true">
              <span className="h-28 w-14 bg-[#141414]" />
              <span className="h-16 w-20 border border-[#141414]" />
              <span className="h-40 w-8 bg-[#b9b9b4]" />
            </div>
          </>
        )}

        <span
          className="absolute bottom-5 left-5 rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{ background: t.destaque, color: variante === 1 ? "#14213d" : "#fff" }}
        >
          {botao}
        </span>
      </div>
    </div>
  );
}
