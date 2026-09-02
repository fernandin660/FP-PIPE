import { buscarTelefoneMillionPhones } from "../enriquecimento";
import type { Alvo, Pedido, Provider, ResultadoProvider, TelefoneEncontrado } from "../enrichment/types";

// MillionPhones — telefone via LinkedIn. NÃO distingue tipo (mobile/direct/
// landline/company): hoje a resposta só traz um número, então classificamos
// como "unknown". Provider PAGO: custa créditos de telefone.
export const millionphonesProvider: Provider = {
  nome: "millionphones",
  suporta: ["telefone"],
  timeoutMs: 6000,

  async enrich(pedido, alvo): Promise<ResultadoProvider> {
    const requestId = `${pedido.tipo}:${alvo.chave ?? alvo.linkedin ?? ""}`;
    try {
      const telefones: TelefoneEncontrado[] = [];
      if (alvo.linkedin) {
        const m = await buscarTelefoneMillionPhones(alvo.linkedin);
        if (m.telefone) telefones.push({ numero: m.telefone, tipo: "unknown", fonte: "millionphones", confianca: 55 });
      }
      const encontrado = telefones.length > 0;
      return {
        provider: "millionphones",
        requestId,
        ok: true,
        encontrado,
        creditoConsumido: 0, // credito é resolvido pela matriz de custo no engine
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "millionphones",
        confianca: encontrado ? 55 : 0,
        dados: { telefones },
      };
    } catch (e) {
      return {
        provider: "millionphones",
        requestId,
        ok: false,
        encontrado: false,
        erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "millionphones",
        confianca: 0,
      };
    }
  },
};
