import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DadosEstruturados from "../seo/DadosEstruturados";
import { BarraTopo } from "../studio/Interacoes";
import { Rodape, SeletorIdioma } from "../studio/SiteStudio";
import { DICIONARIOS, IDIOMAS, caminhoIdioma, caminhoPlataforma, type Idioma } from "../studio/dicionario";
import { buscarPost, caminhoBlog, listarPosts, traducoes, type Blog, type Post } from "../../lib/blog";
import { LOCALE_DATA, NOME_IDIOMA, TEXTOS_BLOG } from "../../lib/blog-textos";
import { IMAGEM_COMPARTILHAR, LANG_HTML, ORIGEM_SITE } from "../../lib/seo";

const ID_ORG = `${ORIGEM_SITE}/#organizacao`;
const LOCALE_OG: Record<Idioma, string> = { pt: "pt_BR", fr: "fr_FR", en: "en_GB", es: "es_ES" };

function dataLonga(data: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(LOCALE_DATA[idioma], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${data}T12:00:00Z`)
  );
}

/** Endereço do índice do blog em cada idioma (para o hreflang e o seletor). */
function alternativasIndice(blog: Blog) {
  const languages: Record<string, string> = {};
  for (const l of IDIOMAS) if (listarPosts(blog, l).length) languages[LANG_HTML[l]] = caminhoBlog(blog, l);
  if (languages["pt-BR"]) languages["x-default"] = caminhoBlog(blog, "pt");
  return languages;
}

/* ---------------- metadados ---------------- */

export function metadadosIndice(blog: Blog, idioma: Idioma): Metadata {
  const t = TEXTOS_BLOG[blog][idioma];
  const vazio = listarPosts(blog, idioma).filter((p) => !p.rascunho).length === 0;
  return {
    title: t.titulo,
    description: t.descricao,
    alternates: {
      canonical: caminhoBlog(blog, idioma),
      languages: alternativasIndice(blog),
      types: { "application/rss+xml": `${caminhoBlog(blog, idioma)}/rss.xml` },
    },
    openGraph: {
      title: t.titulo,
      description: t.descricao,
      url: caminhoBlog(blog, idioma),
      siteName: "FP Pipe",
      locale: LOCALE_OG[idioma],
      type: "website",
      images: [IMAGEM_COMPARTILHAR],
    },
    // Índice sem nenhum artigo publicado não vai para o Google (página vazia).
    robots: vazio ? { index: false, follow: true } : undefined,
  };
}

export function metadadosArtigo(blog: Blog, idioma: Idioma, slug: string): Metadata {
  const post = buscarPost(blog, idioma, slug);
  if (!post) return {};
  const languages: Record<string, string> = {};
  const trad = traducoes(post);
  for (const l of IDIOMAS) {
    const p = trad[l];
    if (p) languages[LANG_HTML[l]] = caminhoBlog(blog, l, p.slug);
  }
  if (trad.pt) languages["x-default"] = caminhoBlog(blog, "pt", trad.pt.slug);
  return {
    title: `${post.titulo} — FP Pipe`,
    description: post.descricao,
    authors: [{ name: post.autor.nome }],
    alternates: { canonical: caminhoBlog(blog, idioma, slug), languages },
    openGraph: {
      title: post.titulo,
      description: post.descricao,
      url: caminhoBlog(blog, idioma, slug),
      siteName: "FP Pipe",
      locale: LOCALE_OG[idioma],
      type: "article",
      publishedTime: post.data,
      modifiedTime: post.atualizado ?? post.data,
      authors: [post.autor.nome],
      images: [IMAGEM_COMPARTILHAR],
    },
    twitter: { card: "summary_large_image", title: post.titulo, description: post.descricao, images: [IMAGEM_COMPARTILHAR.url] },
    robots: post.rascunho ? { index: false, follow: false } : undefined,
  };
}

/* ---------------- cabeçalho ---------------- */

function MarcaBlog({ blog }: { blog: Blog }) {
  return (
    <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M9 1.5 16.5 15H1.5Z" fill="#2442e5" />
      </svg>
      FP Pipe <span className="font-normal text-[#5e5e66]">{blog === "sites" ? "Studio" : "Blog"}</span>
    </span>
  );
}

function Cabecalho({ blog, idioma, destino }: { blog: Blog; idioma: Idioma; destino: (l: Idioma) => string }) {
  const dic = DICIONARIOS[idioma];
  const t = TEXTOS_BLOG[blog][idioma];
  const casa = blog === "sites" ? caminhoIdioma(idioma) : caminhoPlataforma(idioma);
  return (
    <BarraTopo>
      <div className="studio-container flex h-[72px] items-center justify-between gap-4">
        <Link href={casa} className="shrink-0" aria-label="FP Pipe">
          <MarcaBlog blog={blog} />
        </Link>
        <nav aria-label="Blog" className="flex items-center gap-3 text-sm sm:gap-6">
          <Link href={caminhoBlog(blog, idioma)} className="studio-link-nav hidden sm:inline">
            {t.nome}
          </Link>
          <Link href={casa} className="studio-link-nav hidden sm:inline">
            {t.inicio}
          </Link>
          <SeletorIdioma idioma={idioma} rotulo={dic.nav.idioma} destino={destino} />
        </nav>
      </div>
    </BarraTopo>
  );
}

/* ---------------- índice ---------------- */

/** "Blog FP Pipe — sites que trazem clientes" → "Sites que trazem clientes". */
function tituloCapa(titulo: string): string {
  const parte = titulo.split(" — ")[1] ?? titulo;
  return parte.charAt(0).toUpperCase() + parte.slice(1);
}

export function IndiceBlog({ blog, idioma }: { blog: Blog; idioma: Idioma }) {
  const t = TEXTOS_BLOG[blog][idioma];
  const posts = listarPosts(blog, idioma);
  const dadosBlog = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${ORIGEM_SITE}${caminhoBlog(blog, idioma)}#blog`,
    name: t.titulo,
    description: t.descricao,
    url: `${ORIGEM_SITE}${caminhoBlog(blog, idioma)}`,
    inLanguage: LANG_HTML[idioma],
    publisher: { "@id": ID_ORG },
    blogPost: posts
      .filter((p) => !p.rascunho)
      .slice(0, 20)
      .map((p) => ({
        "@type": "BlogPosting",
        headline: p.titulo,
        url: `${ORIGEM_SITE}${caminhoBlog(blog, idioma, p.slug)}`,
        datePublished: p.data,
        author: { "@type": p.autor.chave === "equipe" ? "Organization" : "Person", name: p.autor.nome },
      })),
  };
  return (
    <>
      <DadosEstruturados dados={dadosBlog} />
      <Cabecalho blog={blog} idioma={idioma} destino={(l) => caminhoBlog(blog, l)} />
      <main id="conteudo">
        <section className="studio-container pb-10 pt-16 md:pb-16 md:pt-24">
          <p className="studio-selo mb-6">{t.selo}</p>
          <h1 className="studio-titulo-secao max-w-[18ch]">{tituloCapa(t.titulo)}</h1>
          <p className="mt-6 max-w-[60ch] text-lg text-[#4b4b53]">{t.descricao}</p>
        </section>
        <section className="studio-container pb-24">
          {posts.length === 0 ? (
            <p className="border-t border-[#d6d4cd] pt-10 text-[#5e5e66]">{t.vazio}</p>
          ) : (
            <ul className="border-t border-[#d6d4cd]">
              {posts.map((p) => (
                <li key={p.slug} className="border-b border-[#d6d4cd]">
                  <Link href={caminhoBlog(blog, idioma, p.slug)} className="group grid gap-3 py-8 md:grid-cols-[180px_1fr_auto] md:items-baseline md:gap-10">
                    <span className="text-sm text-[#5e5e66]">
                      <time dateTime={p.data}>{dataLonga(p.data, idioma)}</time>
                    </span>
                    <span>
                      {p.rascunho && (
                        <span className="mb-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">{t.rascunho}</span>
                      )}
                      <span className="block text-2xl font-medium tracking-[-0.02em] transition-colors group-hover:text-[#2442e5] md:text-[1.7rem]">
                        {p.titulo}
                      </span>
                      <span className="mt-2 block max-w-[62ch] text-[#4b4b53]">{p.descricao}</span>
                    </span>
                    <span className="text-sm text-[#5e5e66]">
                      {p.minutosLeitura} {t.minutos}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Rodape dic={DICIONARIOS[idioma]} idioma={idioma} />
    </>
  );
}

/* ---------------- artigo ---------------- */

export function PaginaArtigo({ blog, idioma, slug }: { blog: Blog; idioma: Idioma; slug: string }) {
  const post = buscarPost(blog, idioma, slug);
  if (!post) notFound();
  const t = TEXTOS_BLOG[blog][idioma];
  const trad = traducoes(post);
  const outras = IDIOMAS.filter((l) => l !== idioma && trad[l]) as Idioma[];
  const url = `${ORIGEM_SITE}${caminhoBlog(blog, idioma, slug)}`;
  const casa = blog === "sites" ? caminhoIdioma(idioma) : caminhoPlataforma(idioma);

  const dados = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#artigo`,
        mainEntityOfPage: url,
        headline: post.titulo,
        description: post.descricao,
        inLanguage: LANG_HTML[idioma],
        datePublished: post.data,
        dateModified: post.atualizado ?? post.data,
        author: { "@type": post.autor.chave === "equipe" ? "Organization" : "Person", name: post.autor.nome },
        publisher: { "@id": ID_ORG },
        image: `${ORIGEM_SITE}${IMAGEM_COMPARTILHAR.url}`,
        isPartOf: { "@id": `${ORIGEM_SITE}${caminhoBlog(blog, idioma)}#blog` },
        ...(post.categoria ? { articleSection: post.categoria } : {}),
        wordCount: post.minutosLeitura * 220,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.inicio, item: `${ORIGEM_SITE}${casa}` },
          { "@type": "ListItem", position: 2, name: t.nome, item: `${ORIGEM_SITE}${caminhoBlog(blog, idioma)}` },
          { "@type": "ListItem", position: 3, name: post.titulo, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <DadosEstruturados dados={dados} />
      <Cabecalho blog={blog} idioma={idioma} destino={(l) => (trad[l] ? caminhoBlog(blog, l, trad[l]!.slug) : caminhoBlog(blog, l))} />
      <main id="conteudo">
        <article className="studio-container pb-20 pt-12 md:pt-20">
          <nav aria-label="Breadcrumb" className="mb-10 text-sm text-[#5e5e66]">
            <Link href={casa} className="studio-link-nav">
              {t.inicio}
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <Link href={caminhoBlog(blog, idioma)} className="studio-link-nav">
              {t.nome}
            </Link>
          </nav>

          <header className="max-w-[46rem]">
            {post.rascunho && (
              <p className="mb-5 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">{t.rascunho}</p>
            )}
            {post.categoria && <p className="studio-selo mb-5">{post.categoria}</p>}
            <h1 className="text-[2.3rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[3.4rem]">{post.titulo}</h1>
            <p className="mt-6 text-lg text-[#4b4b53] md:text-xl">{post.descricao}</p>
            <p className="mt-8 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#d6d4cd] pt-5 text-sm text-[#5e5e66]">
              <span>
                {t.porAutor} <span className="font-medium text-[#111114]">{post.autor.nome}</span>
              </span>
              <span>
                {t.publicado} <time dateTime={post.data}>{dataLonga(post.data, idioma)}</time>
              </span>
              {post.atualizado && post.atualizado !== post.data && (
                <span>
                  {t.atualizado} <time dateTime={post.atualizado}>{dataLonga(post.atualizado, idioma)}</time>
                </span>
              )}
              <span>
                {post.minutosLeitura} {t.minutos}
              </span>
            </p>
          </header>

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,46rem)_1fr]">
            <div className="studio-artigo" dangerouslySetInnerHTML={{ __html: post.html }} />
            {post.sumario.length > 2 && (
              <aside className="hidden lg:block">
                <nav aria-label={t.sumario} className="sticky top-28 border-l border-[#d6d4cd] pl-5 text-sm">
                  <p className="mb-3 font-medium text-[#111114]">{t.sumario}</p>
                  <ol className="space-y-2">
                    {post.sumario.map((s) => (
                      <li key={s.id}>
                        <a href={`#${s.id}`} className="text-[#5e5e66] hover:text-[#2442e5]">
                          {s.texto}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>
            )}
          </div>

          <div className="mt-16 max-w-[46rem] space-y-8">
            <p className="text-xs text-[#5e5e66]">{t.ia}</p>
            {outras.length > 0 && (
              <p className="text-sm text-[#5e5e66]">
                {t.outrosIdiomas}{" "}
                {outras.map((l, i) => (
                  <span key={l}>
                    {i > 0 && " · "}
                    <Link href={caminhoBlog(blog, l, trad[l]!.slug)} hrefLang={LANG_HTML[l]} lang={LANG_HTML[l]} className="studio-link-nav text-[#2442e5]">
                      {NOME_IDIOMA[l]}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <div className="rounded-[18px] bg-[#111114] p-8 text-[#f4f3ef] md:p-10">
              <p className="text-2xl font-medium tracking-[-0.02em]">{t.cta.titulo}</p>
              <p className="mt-3 max-w-[48ch] text-[#b9b9c0]">{t.cta.texto}</p>
              <Link href={t.cta.href} className="studio-botao mt-6 inline-flex">
                {t.cta.botao} <span aria-hidden="true">→</span>
              </Link>
            </div>
            <Link href={caminhoBlog(blog, idioma)} className="studio-link-nav inline-block text-sm">
              ← {t.voltar}
            </Link>
          </div>
        </article>
      </main>
      <Rodape dic={DICIONARIOS[idioma]} idioma={idioma} />
    </>
  );
}

/** RSS do blog (para leitores de feed e descoberta por buscadores). */
export function rssBlog(blog: Blog, idioma: Idioma): Response {
  const t = TEXTOS_BLOG[blog][idioma];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const itens = listarPosts(blog, idioma)
    .filter((p) => !p.rascunho)
    .map((p: Post) => {
      const link = `${ORIGEM_SITE}${caminhoBlog(blog, idioma, p.slug)}`;
      return `<item><title>${esc(p.titulo)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${new Date(
        `${p.data}T12:00:00Z`
      ).toUTCString()}</pubDate><description>${esc(p.descricao)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(t.titulo)}</title><link>${ORIGEM_SITE}${caminhoBlog(
    blog,
    idioma
  )}</link><description>${esc(t.descricao)}</description><language>${LANG_HTML[idioma]}</language>${itens}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

