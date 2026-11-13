import Link from "next/link";
import BannerCookies from "../studio/BannerCookies";
import { BarraTopo, CursorStudio, Revelar } from "../studio/Interacoes";
import { SeletorIdioma } from "../studio/SiteStudio";
import { DICIONARIOS, caminhoIdioma, caminhoPlataforma, type Idioma } from "../studio/dicionario";
import AvatarConsultor from "../AvatarConsultor";
import { DEFINICAO_PLANOS } from "../../lib/planos";
import { formatarPreco, precoInternacional, type PlanoInternacional } from "../../lib/precos-internacionais";
import { TEXTOS_PLATAFORMA, type TextosPlataforma } from "./textos";
import { caminhoBlog, listarPosts } from "../../lib/blog";

export type ChaveNacional = "silver" | "gold" | "platinum";
export const ORDEM: ChaveNacional[] = ["silver", "gold", "platinum"];

/** Preço exibido de cada plano: reais (nacional) ou euro/dólar (internacional, +10%). */
export function precos(chave: ChaveNacional, t: TextosPlataforma) {
  if (t.moeda === "BRL") {
    const def = DEFINICAO_PLANOS[chave];
    return { mensal: def.precoMensal, anualPorMes: def.precoAnualPorMes };
  }
  return precoInternacional(`${chave}_intl` as PlanoInternacional, t.moeda);
}

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

export default function LandingPlataforma({ idioma }: { idioma: Idioma }) {
  const t = TEXTOS_PLATAFORMA[idioma];
  const brasil = idioma === "pt";
  const preco = (v: number) => formatarPreco(v, t.moeda, t.local);
  // Fora do Brasil o cadastro é o próximo passo (cobrança em moeda estrangeira ainda não existe).
  const destinoAssinar = brasil ? "/planos" : "/prospeccao";

  return (
    <>
      <CursorStudio />
      <BannerCookies dic={DICIONARIOS[idioma]} idioma={idioma} />

      <BarraTopo>
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-6 md:h-20 md:px-10">
          <Link href={caminhoPlataforma(idioma)} aria-label="FP Pipe">
            <Marca />
          </Link>
          <nav aria-label={t.nav.menu} className="hidden items-center gap-7 text-sm text-[#4b4b53] xl:flex">
            <a href="#como-funciona" className="studio-link-nav">{t.nav.comoFunciona}</a>
            <a href="#recursos" className="studio-link-nav">{t.nav.recursos}</a>
            <a href="#planos" className="studio-link-nav">{t.nav.planos}</a>
            <a href="#perguntas" className="studio-link-nav">{t.nav.perguntas}</a>
            <Link href={caminhoIdioma(idioma)} className="studio-link-nav">{t.nav.sites}</Link>
            {listarPosts("prospeccao", idioma).length > 0 && (
              <Link href={caminhoBlog("prospeccao", idioma)} className="studio-link-nav">Blog</Link>
            )}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:block">
              <SeletorIdioma idioma={idioma} rotulo={t.nav.idioma} destino={caminhoPlataforma} />
            </div>
            <Link href="/login" className="studio-link-nav px-2 text-sm font-medium">
              {t.nav.entrar}
            </Link>
            <Link href="/prospeccao" className="studio-botao !min-h-[44px] !px-5 !py-2.5 !text-sm">
              {t.nav.criarConta}
            </Link>
          </div>
        </div>
      </BarraTopo>

      <main>
        {/* HERO */}
        <section className="studio-container grid items-center gap-14 pb-20 pt-32 md:pt-44 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-32">
          <div>
            <p className="studio-selo mb-6">{t.hero.selo}</p>
            <h1 className="studio-titulo-hero">{t.hero.titulo}</h1>
            <p className="mt-7 max-w-[48ch] text-lg leading-relaxed text-[#4b4b53] md:text-xl">{t.hero.texto}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/prospeccao" className="studio-botao">
                {t.hero.cta} <span aria-hidden="true">→</span>
              </Link>
              <a href="#planos" className="studio-botao-fantasma">
                {t.hero.ctaPlanos}
              </a>
            </div>
            <p className="mt-5 text-sm text-[#5e5e66]">{t.hero.nota}</p>
          </div>

          <ExemploProduto t={t} />
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="studio-secao bg-[#ebe9e3]">
          <div className="studio-container">
            <Revelar>
              <p className="studio-selo mb-6">{t.passos.selo}</p>
              <h2 className="studio-titulo-secao">{t.passos.titulo}</h2>
            </Revelar>
            <ol className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-8">
              {t.passos.itens.map((p, i) => (
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
              <p className="studio-selo mb-6">{t.recursos.selo}</p>
              <h2 className="studio-titulo-secao max-w-[22ch]">{t.recursos.titulo}</h2>
            </Revelar>
            <div className="mt-14 grid border-t border-[#111114] md:mt-20 md:grid-cols-2 lg:grid-cols-3">
              {t.recursos.itens.map((r, i) => (
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
              <ExemploFunil t={t} />
            </Revelar>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="studio-secao bg-[#ebe9e3]">
          <div className="studio-container">
            <Revelar>
              <p className="studio-selo mb-6">{t.planos.selo}</p>
              <h2 className="studio-titulo-secao">{t.planos.titulo}</h2>
              <p className="mt-5 max-w-[56ch] text-[#4b4b53]">{t.planos.texto}</p>
            </Revelar>
            <div className="mt-14 grid gap-5 md:mt-20 lg:grid-cols-3">
              {ORDEM.map((chave, i) => {
                const nome = DEFINICAO_PLANOS[chave].nome;
                const itens = t.planos[chave];
                const valor = precos(chave, t);
                const destaque = chave === "gold";
                const suave = destaque ? "text-[#b9b9c0]" : "text-[#5e5e66]";
                return (
                  <Revelar key={chave} atraso={i * 90}>
                    <div
                      className={`flex h-full flex-col rounded-[18px] border p-7 ${
                        destaque ? "border-[#111114] bg-[#111114] text-[#f4f3ef]" : "border-[#d6d4cd] bg-[#f4f3ef]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">{nome}</h3>
                        {destaque && (
                          <span className="rounded-full bg-[#2442e5] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white">
                            {t.planos.recomendado}
                          </span>
                        )}
                      </div>
                      <p className="mt-6 flex items-baseline gap-1">
                        <span className="text-5xl font-medium tracking-[-0.04em]">{preco(valor.mensal)}</span>
                        <span className={suave}>{t.planos.porMes}</span>
                      </p>
                      <p className={`mt-2 text-sm ${suave}`}>
                        {t.planos.anual.replace("{preco}", preco(valor.anualPorMes))}
                      </p>
                      <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                        {itens.itens.map((item) => (
                          <li key={item} className="flex gap-3">
                            <Check />
                            <span>{item}</span>
                          </li>
                        ))}
                        {itens.faltam.map((item) => (
                          <li key={item} className="flex gap-3 text-[#8a8a92]">
                            <Check ok={false} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={destinoAssinar}
                        className={`mt-8 justify-center ${destaque ? "studio-botao" : "studio-botao-fantasma"}`}
                      >
                        {t.planos.botao} {nome}
                      </Link>
                    </div>
                  </Revelar>
                );
              })}
            </div>

            {t.planos.internacional && (
              <Revelar>
                <div className="mt-6 flex flex-col gap-4 rounded-[18px] border border-[#d6d4cd] p-7 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{t.planos.internacional.titulo}</h3>
                    <p className="mt-1 text-[15px] text-[#4b4b53]">
                      {t.planos.internacional.texto.replace(
                        "{preco}",
                        preco(DEFINICAO_PLANOS.silver_intl.precoAnualPorMes),
                      )}
                    </p>
                  </div>
                  <Link href="/planos" className="studio-botao-fantasma shrink-0">
                    {t.planos.internacional.botao}
                  </Link>
                </div>
              </Revelar>
            )}
            {t.planos.nota && <p className="mt-6 text-sm text-[#5e5e66]">{t.planos.nota}</p>}
          </div>
        </section>

        {/* PERGUNTAS */}
        <section id="perguntas" className="studio-secao">
          <div className="studio-container grid gap-12 md:grid-cols-[4fr_7fr] md:gap-20">
            <Revelar>
              <p className="studio-selo mb-6">{t.perguntas.selo}</p>
              <h2 className="studio-titulo-secao">{t.perguntas.titulo}</h2>
            </Revelar>
            <Revelar atraso={120}>
              <div className="border-t border-[#111114]">
                {t.perguntas.itens.map((p) => (
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
              <h2 className="studio-titulo-secao max-w-[18ch] !text-[#f4f3ef]">{t.cta.titulo}</h2>
              <p className="mt-6 max-w-[52ch] text-lg text-[#b9b9c0]">{t.cta.texto}</p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/prospeccao" className="studio-botao">
                  {t.cta.botao} <span aria-hidden="true">→</span>
                </Link>
                <Link href="/login" className="studio-link-nav text-sm text-[#b9b9c0] hover:!text-white">
                  {t.cta.entrar}
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
              © {new Date().getFullYear()} FP Pipe · {t.rodape.descricao}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link href={caminhoIdioma(idioma)} className="studio-link-nav">{t.nav.sites}</Link>
            <a href="#planos" className="studio-link-nav">{t.nav.planos}</a>
            {listarPosts("prospeccao", idioma).length > 0 && (
              <Link href={caminhoBlog("prospeccao", idioma)} className="studio-link-nav">Blog</Link>
            )}
            <Link href="/login" className="studio-link-nav">{t.nav.entrar}</Link>
            <Link href="/termos" className="studio-link-nav">{t.rodape.termos}</Link>
            <Link href="/privacidade" className="studio-link-nav">{t.rodape.privacidade}</Link>
            <SeletorIdioma idioma={idioma} rotulo={t.nav.idioma} destino={caminhoPlataforma} />
          </div>
        </div>
      </footer>
      {/* O consultor atende por WhatsApp em português. */}
      {brasil && <AvatarConsultor />}
    </>
  );
}

/** Ficha de empresa como aparece no produto (dados de exemplo). */
function ExemploProduto({ t }: { t: TextosPlataforma }) {
  const p = t.produto;
  return (
    <figure className="relative">
      <div className="overflow-hidden rounded-[18px] border border-[#d6d4cd] bg-white shadow-[0_24px_60px_-30px_rgba(17,17,20,0.25)]">
        <div className="flex items-center justify-between border-b border-[#e9e7e1] px-5 py-3 text-xs text-[#6b6b72]">
          <span>{p.lista}</span>
          <span>{p.qtd}</span>
        </div>
        <div className="p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-medium tracking-tight">{p.empresa}</p>
              <p className="mt-1 text-sm text-[#5e5e66]">{p.local}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-medium tracking-[-0.04em] text-[#2442e5]">92</p>
              <p className="text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">{p.score}</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ecebe6]">
            <div className="h-full w-[92%] rounded-full bg-[#2442e5]" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#4b4b53]">{p.justificativa}</p>

          <dl className="mt-6 grid gap-3 border-t border-[#e9e7e1] pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">{p.aprovadorRotulo}</dt>
              <dd className="mt-1 font-medium">{p.aprovador}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">{p.influenciadorRotulo}</dt>
              <dd className="mt-1 font-medium">{p.influenciador}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-[12px] bg-[#f4f3ef] p-4">
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.1em] text-[#6b6b72]">
              <span>{p.abordagemRotulo}</span>
              <span className="normal-case tracking-normal">{p.abordagemNota}</span>
            </div>
            <p className="mt-3 text-sm font-medium">{p.assunto}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#4b4b53]">{p.corpo}</p>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-[#5e5e66]">{p.legenda}</figcaption>
    </figure>
  );
}

/** Funil do CRM em miniatura (dados de exemplo). */
function ExemploFunil({ t }: { t: TextosPlataforma }) {
  const f = t.funil;
  return (
    <figure className="mt-16 md:mt-24">
      <div className="overflow-hidden rounded-[18px] border border-[#d6d4cd] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#e9e7e1] px-5 py-3 text-xs text-[#6b6b72]">
          <span>{f.titulo}</span>
          <span>{f.cadencia}</span>
        </div>
        <div className="grid gap-4 bg-[#faf9f6] p-4 md:grid-cols-3 md:p-6">
          {f.colunas.map((c) => (
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
      <figcaption className="mt-3 text-sm text-[#5e5e66]">{f.legenda}</figcaption>
    </figure>
  );
}
