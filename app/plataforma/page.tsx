import type { Metadata } from "next";
import Envelope from "../../components/studio/Envelope";
import LandingPlataforma from "../../components/plataforma/LandingPlataforma";
import { metadadosPlataforma } from "../../components/plataforma/metadados";

export const metadata: Metadata = metadadosPlataforma("pt");

export default function PaginaPlataforma() {
  return (
    <Envelope idioma="pt-BR">
      <LandingPlataforma idioma="pt" />
    </Envelope>
  );
}
