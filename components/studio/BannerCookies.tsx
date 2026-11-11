"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dicionario, Idioma } from "./dicionario";

/*
 * Banner de cookies (RGPD / recomendações da CNIL):
 * - "Recusar" tem o mesmo peso visual de "Aceitar";
 * - nada opcional é carregado antes da escolha (hoje o site não usa
 *   nenhum cookie opcional);
 * - a escolha vale 6 meses e pode ser mudada em "Gerenciar cookies".
 * Futuras ferramentas de medição devem checar `consentimentoMedicao()`.
 */

const CHAVE = "fp-studio-consentimento";
const VALIDADE_MS = 182 * 24 * 60 * 60 * 1000;
const EVENTO_ABRIR = "fp-studio-abrir-cookies";

type Escolha = { aceito: boolean; em: number };

function lerEscolha(): Escolha | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const e = JSON.parse(bruto) as Escolha;
    if (typeof e.em !== "number" || Date.now() - e.em > VALIDADE_MS) return null;
    return e;
  } catch {
    return null;
  }
}

export function consentimentoMedicao(): boolean {
  return lerEscolha()?.aceito === true;
}

export function BotaoGerenciarCookies({ rotulo }: { rotulo: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR))}
      className="studio-link-nav text-sm"
    >
      {rotulo}
    </button>
  );
}

export default function BannerCookies({ dic, idioma }: { dic: Dicionario; idioma: Idioma }) {
  const [aberto, setAberto] = useState(false);
  const c = dic.cookies;

  useEffect(() => {
    // Pequeno atraso: o banner aparece depois do primeiro quadro do hero.
    const t = setTimeout(() => {
      if (!lerEscolha()) setAberto(true);
    }, 600);
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => {
      clearTimeout(t);
      window.removeEventListener(EVENTO_ABRIR, abrir);
    };
  }, []);

  function escolher(aceito: boolean) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ aceito, em: Date.now() } satisfies Escolha));
    } catch {
      // navegador sem armazenamento: só fecha
    }
    setAberto(false);
  }

  if (!aberto) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookies-titulo"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[560px] rounded-[16px] md:max-w-[440px] border border-[#d6d4cd] bg-[#fbfaf8] p-5 shadow-[0_12px_40px_rgba(17,17,20,0.12)] md:bottom-6 md:left-6 md:right-auto md:p-6"
    >
      <p id="cookies-titulo" className="text-sm font-medium">
        {c.titulo}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#4b4b53]">
        {c.texto}{" "}
        <Link href={`/${idioma}/confidentialite`} className="underline underline-offset-2 hover:text-[#111114]">
          {c.saberMais}
        </Link>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => escolher(false)} className="studio-botao-fantasma justify-center !text-[14px]">
          {c.recusar}
        </button>
        <button type="button" onClick={() => escolher(true)} className="studio-botao-fantasma justify-center !text-[14px]">
          {c.aceitar}
        </button>
      </div>
    </div>
  );
}
