import type { Alvo, Pedido, Provider, ResultadoProvider, TelefoneEncontrado } from "../enrichment/types";

// Provider dedicado a "encontrar telefone da empresa no Google Maps",
// espelhando EXATAMENTE a rota /api/buscar-maps:
//   • escolhe o 1º lugar COM telefone;
//   • expõe o displayName como `fonteNome`;
//   • distingue HTTP não-ok (erro.codigo "recusado") de falha de rede ("error").
// Não interfere no provider `maps` (usado por buscar-empresa/enriquecer-lista).
const CHAVE_MAPS = process.env.GOOGLE_MAPS_API_KEY ?? "";

export const mapsSearchProvider: Provider = {
  nome: "maps-search",
  suporta: ["telefone"],
  timeoutMs: 8000,

  async enrich(pedido: Pedido, alvo: Alvo): Promise<ResultadoProvider> {
    const requestId = `telefone:${alvo.chave ?? alvo.nomeEmpresa ?? ""}`;
    const base: Omit<ResultadoProvider, "dados"> = {
      provider: "maps-search",
      requestId,
      ok: true,
      encontrado: false,
      creditoConsumido: 0,
      custoEstimado: 0,
      moeda: "credito",
      cacheHit: false,
      fonte: "maps",
      confianca: 0,
    };

    if (!CHAVE_MAPS) {
      return { ...base, ok: false, erro: { codigo: "sem_chave", mensagem: "Google Maps não configurado." } };
    }

    try {
      const termo = [alvo.nomeEmpresa, alvo.cidade, alvo.uf].filter(Boolean).join(" ");
      const resposta = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": CHAVE_MAPS,
            "X-Goog-FieldMask":
              "places.displayName,places.internationalPhoneNumber,places.nationalPhoneNumber",
          },
          body: JSON.stringify({
            textQuery: termo,
            languageCode: "pt-BR",
            regionCode: "BR",
          }),
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!resposta.ok) {
        return {
          ...base,
          ok: false,
          erro: { codigo: "recusado", mensagem: "Google Maps recusou a consulta. Verifique a chave/billing." },
        };
      }

      const dados = (await resposta.json()) as {
        places?: Array<{
          displayName?: { text?: string };
          internationalPhoneNumber?: string;
          nationalPhoneNumber?: string;
        }>;
      };

      const lugar = (dados.places ?? []).find(
        (p) =>
          typeof p.internationalPhoneNumber === "string" ||
          typeof p.nationalPhoneNumber === "string"
      );

      const telefoneMaps =
        lugar?.internationalPhoneNumber ?? lugar?.nationalPhoneNumber ?? null;

      if (!telefoneMaps) return { ...base, ok: true, encontrado: false, fonte: "maps" };

      const telefones: TelefoneEncontrado[] = [
        { numero: telefoneMaps, tipo: "company", fonte: "maps", confianca: 55 },
      ];

      return {
        ...base,
        ok: true,
        encontrado: true,
        confianca: 55,
        fonte: "maps",
        dados: {
          telefones,
          fonteNome: lugar?.displayName?.text ?? "Google Maps",
        },
      };
    } catch (e) {
      return {
        ...base,
        ok: false,
        erro: { codigo: "error", mensagem: "Não foi possível falar com o Google Maps agora." },
      };
    }
  },
};
