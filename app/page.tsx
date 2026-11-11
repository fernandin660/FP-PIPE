import type { Metadata } from "next";
import Envelope from "../components/studio/Envelope";
import SiteStudio from "../components/studio/SiteStudio";
import { DICIONARIOS } from "../components/studio/dicionario";
import { metadadosStudio } from "../components/studio/metadados";

// Página inicial do domínio: site institucional (criação de sites), em
// português. O software de prospecção fica em /plataforma.
export const metadata: Metadata = metadadosStudio("pt");

export default function PaginaInicial() {
  return (
    <Envelope idioma="pt-BR">
      <SiteStudio dic={DICIONARIOS.pt} idioma="pt" />
    </Envelope>
  );
}
