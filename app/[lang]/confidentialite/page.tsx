import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Marca, Rodape } from "../../../components/studio/SiteStudio";
import { DICIONARIOS, ehIdioma } from "../../../components/studio/dicionario";

export async function generateMetadata({ params }: PageProps<"/[lang]/confidentialite">): Promise<Metadata> {
  const { lang } = await params;
  if (!ehIdioma(lang)) return {};
  return { title: `${DICIONARIOS[lang].privacidade.titulo} — FP Pipe Studio`, description: DICIONARIOS[lang].meta.descricao };
}

export default async function Confidentialite({ params }: PageProps<"/[lang]/confidentialite">) {
  const { lang } = await params;
  if (!ehIdioma(lang)) notFound();
  const dic = DICIONARIOS[lang];
  const p = dic.privacidade;

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
        <h1 className="studio-titulo-secao">{p.titulo}</h1>
        <p className="mt-4 text-sm text-[#5e5e66]">{p.atualizado}</p>
        <p className="mt-8 max-w-[68ch] text-lg leading-relaxed text-[#3a3a41]">{p.intro}</p>
        <div className="mt-14 max-w-[68ch] divide-y divide-[#d6d4cd] border-t border-[#111114]">
          {p.secoes.map((s) => (
            <section key={s.titulo} className="py-8">
              <h2 className="text-xl font-medium tracking-tight">{s.titulo}</h2>
              {s.texto && <p className="mt-3 leading-relaxed text-[#3a3a41]">{s.texto}</p>}
              {s.itens && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-[#3a3a41] marker:text-[#2442e5]">
                  {s.itens.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
      <Rodape dic={dic} idioma={lang} />
    </>
  );
}
