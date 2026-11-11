import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Marca, Rodape } from "../../../components/studio/SiteStudio";
import { DICIONARIOS, ehIdioma } from "../../../components/studio/dicionario";

export async function generateMetadata({ params }: PageProps<"/[lang]/mentions-legales">): Promise<Metadata> {
  const { lang } = await params;
  if (!ehIdioma(lang)) return {};
  return { title: `${DICIONARIOS[lang].mentions.titulo} — FP Pipe Studio`, description: DICIONARIOS[lang].meta.descricao, robots: { index: false } };
}

export default async function MentionsLegales({ params }: PageProps<"/[lang]/mentions-legales">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  const dic = DICIONARIOS[lang];

  return (
    <>
      <header className="studio-container flex h-20 items-center justify-between">
        <Link href={`/${lang}`} aria-label="FP Pipe Studio">
          <Marca />
        </Link>
        <Link href={`/${lang}`} className="studio-link-nav text-sm">
          ← {dic.mentions.voltar}
        </Link>
      </header>
      <main className="studio-container pb-24 pt-12 md:pt-20">
        <h1 className="studio-titulo-secao">{dic.mentions.titulo}</h1>
        <div className="mt-14 max-w-[68ch] divide-y divide-[#d6d4cd] border-t border-[#111114]">
          {dic.mentions.secoes.map((s) => (
            <section key={s.titulo} className="py-8">
              <h2 className="text-xl font-medium tracking-tight">{s.titulo}</h2>
              <p className="mt-3 leading-relaxed text-[#3a3a41]">{s.texto}</p>
            </section>
          ))}
        </div>
      </main>
      <Rodape dic={dic} idioma={lang} />
    </>
  );
}
