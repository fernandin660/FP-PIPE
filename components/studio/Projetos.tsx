import Image from "next/image";
import { CartaoInclinavel, Revelar } from "./Interacoes";
import type { Dicionario, Idioma } from "./dicionario";

const CHATEAU = {
  nome: "Château Saint-Martin de Graves",
  dominio: "saint-martin-estate-stories.lovable.app",
  foto: "https://saint-martin-estate-stories.lovable.app/__l5e/assets-v1/2b209a27-32e4-41bb-bb90-003b2b3c4903/csm-chateau.webp",
};
// Fotos Unsplash (licença Unsplash, uso livre)
const FOTO_BISTRO = "https://images.unsplash.com/photo-1655389156459-795221acc383?auto=format&fit=crop&w=1600&q=80";
const FOTO_INTERIOR = "https://images.unsplash.com/photo-1617596225496-1d9da33a144b?auto=format&fit=crop&w=1600&q=80";

function BarraNavegador({ endereco }: { endereco: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#e3e1db] bg-[#fbfaf8] px-3 py-2.5" aria-hidden="true">
      <span className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e0ded8]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e0ded8]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e0ded8]" />
      </span>
      <span className="mx-auto max-w-[70%] truncate rounded-md bg-[#efede8] px-3 py-1 text-[11px] text-[#6b6b72]">{endereco}</span>
      <span className="w-[42px]" />
    </div>
  );
}

function Legenda({ nome, setor, etiqueta, children }: { nome: string; setor: string; etiqueta: string; children?: React.ReactNode }) {
  return (
    <figcaption className="mt-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <span>
        <span className="block text-lg font-medium tracking-tight">{nome}</span>
        <span className="text-sm text-[#5e5e66]">{setor}</span>
      </span>
      <span className="flex items-center gap-4">
        {children}
        <span className="studio-etiqueta">{etiqueta}</span>
      </span>
    </figcaption>
  );
}

export default function Projetos({ dic, idioma }: { dic: Dicionario; idioma: Idioma }) {
  const c = dic.conceitos;
  const p = c.prototipo;
  const [lucette, halde] = c.projetos;
  const linkPrototipo = `https://${CHATEAU.dominio}/${idioma === "fr" ? "" : "en"}`;

  return (
    <div className="mt-14 grid gap-14 md:mt-20 md:grid-cols-2 md:gap-x-6 md:gap-y-16">
      {/* Protótipo real — destaque em largura total */}
      <Revelar className="md:col-span-2">
        <figure>
          <CartaoInclinavel>
            <a
              href={linkPrototipo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${p.abrir} — ${CHATEAU.nome}`}
              className="group block overflow-hidden rounded-[16px] border border-[#d6d4cd] bg-white"
            >
              <BarraNavegador endereco={CHATEAU.dominio} />
              <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[16/10] lg:aspect-[16/8.2]">
                <Image
                  src={CHATEAU.foto}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 1240px"
                  className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,10,0.45)_0%,rgba(18,14,10,0)_30%,rgba(18,14,10,0)_45%,rgba(18,14,10,0.62)_100%)]" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 text-white md:p-8">
                  <span className="font-[family-name:var(--font-concept-serif)] text-[15px] uppercase tracking-[0.28em] md:text-lg">
                    Saint-Martin
                  </span>
                  <span className="hidden items-center gap-7 text-[13px] tracking-wide lg:flex">
                    {p.menu.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                    <span className="rounded-full border border-white/80 px-4 py-2">{p.botao}</span>
                  </span>
                  <span className="flex flex-col gap-1 lg:hidden" aria-hidden="true">
                    <span className="h-px w-6 bg-white" />
                    <span className="h-px w-6 bg-white" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-10">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/80 md:text-xs">Pézenas · Occitanie</p>
                  <p className="mt-3 max-w-[14ch] font-[family-name:var(--font-concept-serif)] text-[2.4rem] font-medium italic leading-[0.95] md:text-[4.6rem]">
                    {p.frase}
                  </p>
                </div>
              </div>
            </a>
          </CartaoInclinavel>
          <Legenda nome={CHATEAU.nome} setor={p.setor} etiqueta={p.etiqueta}>
            <a href={linkPrototipo} target="_blank" rel="noopener noreferrer" className="studio-link-nav text-sm font-medium">
              {p.abrir} <span aria-hidden="true">↗</span>
            </a>
          </Legenda>
        </figure>
      </Revelar>

      {/* Conceito 1: bistrô */}
      <Revelar>
        <figure>
          <CartaoInclinavel>
            <div className="group overflow-hidden rounded-[16px] border border-[#d6d4cd] bg-white" aria-hidden="true">
              <BarraNavegador endereco="lucette-paris.fr" />
              <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/3.6]">
                <Image
                  src={FOTO_BISTRO}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 620px"
                  className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-[rgba(30,20,12,0.18)]" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 text-[#fbf4e8]">
                  <span className="font-[family-name:var(--font-concept-serif)] text-2xl italic">Lucette</span>
                  <span className="hidden gap-5 text-[12px] uppercase tracking-[0.16em] sm:flex">
                    {lucette.menu.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 max-w-[330px] rounded-[10px] bg-[#f3ebdd] p-5 text-[#2a1e16] sm:bottom-6 sm:left-6 sm:p-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a6a52]">Paris 11e — mardi → samedi</p>
                  <p className="mt-2 font-[family-name:var(--font-concept-serif)] text-[1.9rem] font-medium leading-[1]">{lucette.frase}</p>
                  <span className="mt-4 inline-block rounded-full bg-[#b4532a] px-4 py-2 text-[12px] font-medium text-[#fbf4e8]">
                    {lucette.botao}
                  </span>
                </div>
              </div>
            </div>
          </CartaoInclinavel>
          <Legenda nome={lucette.nome} setor={lucette.setor} etiqueta={c.etiqueta} />
        </figure>
      </Revelar>

      {/* Conceito 2: arquitetura de interiores */}
      <Revelar atraso={120}>
        <figure>
          <CartaoInclinavel>
            <div className="group overflow-hidden rounded-[16px] border border-[#d6d4cd] bg-white" aria-hidden="true">
              <BarraNavegador endereco="studiohalde.com" />
              <div className="grid aspect-[4/5] grid-rows-[1.1fr_1fr] overflow-hidden bg-[#ece9e3] text-[#1c1b19] sm:aspect-[4/3.6] sm:grid-cols-[1fr_1.15fr] sm:grid-rows-1">
                <div className="order-2 flex flex-col justify-between p-5 sm:order-1 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.3em]">Halde</span>
                    <span className="flex gap-3 text-[11px] text-[#5b5953] sm:hidden">
                      {halde.menu.slice(0, 2).map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                    </span>
                  </div>
                  <div>
                    <p className="text-[1.65rem] font-light leading-[1.02] tracking-[-0.03em] sm:text-[2rem]">{halde.frase}</p>
                    <span className="mt-5 inline-flex items-center gap-2 border-b border-[#1c1b19] pb-1 text-[12px] font-medium">
                      {halde.botao} →
                    </span>
                  </div>
                  <span className="hidden gap-4 text-[11px] text-[#5b5953] sm:flex">
                    {halde.menu.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </span>
                </div>
                <div className="relative order-1 overflow-hidden sm:order-2">
                  <Image
                    src={FOTO_INTERIOR}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 340px"
                    className="object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.05]"
                  />
                  <span className="absolute bottom-4 left-4 bg-[#ece9e3] px-2 py-1 text-[10px] tracking-[0.12em] text-[#1c1b19]">
                    N° 07 — Appartement Croix-Rousse
                  </span>
                </div>
              </div>
            </div>
          </CartaoInclinavel>
          <Legenda nome={halde.nome} setor={halde.setor} etiqueta={c.etiqueta} />
        </figure>
      </Revelar>
    </div>
  );
}
