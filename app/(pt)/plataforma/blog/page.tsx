import type { Metadata } from "next";
import Envelope from "../../../../components/studio/Envelope";
import { IndiceBlog, metadadosIndice } from "../../../../components/blog/PaginasBlog";

export const metadata: Metadata = metadadosIndice("prospeccao", "pt");

export default function Pagina() {
  return (
    <Envelope idioma="pt-BR">
      <IndiceBlog blog="prospeccao" idioma="pt" />
    </Envelope>
  );
}
