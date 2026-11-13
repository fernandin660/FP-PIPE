import type { Metadata } from "next";
import Envelope from "../../../components/studio/Envelope";
import LandingPlataforma from "../../../components/plataforma/LandingPlataforma";
import { metadadosPlataforma } from "../../../components/plataforma/metadados";
import DadosEstruturados, { dadosPlataforma } from "../../../components/seo/DadosEstruturados";

export const metadata: Metadata = metadadosPlataforma("pt");

export default function PaginaPlataforma() {
  return (
    <Envelope idioma="pt-BR">
      <DadosEstruturados dados={dadosPlataforma("pt")} />
      <LandingPlataforma idioma="pt" />
    </Envelope>
  );
}
