import type { ReactNode } from "react";
import AjustarIdiomaDocumento from "./AjustarIdiomaDocumento";
import { cormorant, interTight } from "./fontes";
import "./studio.css";

/** Casca visual clara (fontes, cores, idioma) das páginas institucionais. */
export default function Envelope({ idioma, children }: { idioma: string; children: ReactNode }) {
  return (
    <div lang={idioma} className={`studio-raiz ${interTight.variable} ${cormorant.variable}`}>
      <AjustarIdiomaDocumento idioma={idioma} />
      {children}
    </div>
  );
}
