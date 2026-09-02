import { buscarTelefoneMaps } from "../enriquecimento";
import type { Alvo, Pedido, Provider, ResultadoProvider, TelefoneEncontrado } from "../enrichment/types";

// Google Maps Places — telefone (geral/empresa) e website confirmados do local.
export const mapsProvider: Provider = {
  nome: "maps",
  suporta: ["telefone", "website"],
  timeoutMs: 6000,

  async enrich(pedido, alvo): Promise<ResultadoProvider> {
    const requestId = `${pedido.tipo}:${alvo.chave ?? ""}`;
    try {
      const telefones: TelefoneEncontrado[] = [];
      let website: string | null = null;

      if (pedido.tipo === "telefone" || pedido.tipo === "website") {
        const m = await buscarTelefoneMaps(alvo.nomeEmpresa ?? "", alvo.cidade, alvo.uf);
        if (m.telefone) telefones.push({ numero: m.telefone, tipo: "company", fonte: "maps", confianca: 55 });
        if (m.website) website = m.website;
      }

      const encontrado = telefones.length > 0 || !!website;
      return {
        provider: "maps",
        requestId,
        ok: true,
        encontrado,
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "maps",
        confianca: encontrado ? 55 : 0,
        dados: { telefones, website },
      };
    } catch (e) {
      return {
        provider: "maps",
        requestId,
        ok: false,
        encontrado: false,
        erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "maps",
        confianca: 0,
      };
    }
  },
};
