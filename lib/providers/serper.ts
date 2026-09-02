import {
  buscarTelefoneSerper,
  buscarTelefoneEmpresaSerper,
  buscarCargoAtual,
  buscarDadosEmpresaGoogle,
} from "../enriquecimento";
import type { Alvo, Pedido, Provider, ResultadoProvider, TelefoneEncontrado } from "../enrichment/types";

function novo(
  provider: string,
  pedido: Pedido,
  requestId: string,
  ok = true,
  encontrado = false,
  verro?: Error
): ResultadoProvider {
  return {
    provider,
    requestId,
    ok,
    encontrado,
    erro: verro ? { codigo: "error", mensagem: verro.message } : undefined,
    creditoConsumido: 0,
    custoEstimado: 0,
    moeda: "credito",
    cacheHit: false,
    fonte: provider,
    confianca: 0,
  };
}

// Google Search via Serper — telefones PÚBLICOS (empresa), cargo e
// website/linkedin. NÃO devolve e-mail nem telefone pessoal confirmado.
export const serperProvider: Provider = {
  nome: "serper",
  suporta: ["telefone", "cargo", "website", "linkedin_empresa"],
  timeoutMs: 6000,
  maxRetries: 1,

  async enrich(pedido, alvo): Promise<ResultadoProvider> {
    const requestId = `${pedido.tipo}:${alvo.chave ?? alvo.linkedin ?? ""}`;
    try {
      const telefones: TelefoneEncontrado[] = [];
      let cargo: string | null = null;
      let website: string | null = null;
      let linkedinEmpresa: string | null = null;

      if (pedido.tipo === "telefone") {
        if (alvo.nome && alvo.nomeEmpresa) {
          const p = await buscarTelefoneSerper(alvo.nome, alvo.nomeEmpresa);
          if (p.telefone) telefones.push({ numero: p.telefone, tipo: "unknown", fonte: "google_search", confianca: 35 });
        }
        if (alvo.nomeEmpresa) {
          const e = await buscarTelefoneEmpresaSerper(alvo.nomeEmpresa);
          for (const t of e.telefones) telefones.push({ numero: t, tipo: "company", fonte: "google_empresa", confianca: 35 });
        }
      } else if (pedido.tipo === "cargo") {
        const c = await buscarCargoAtual(alvo.nome ?? "", alvo.nomeEmpresa);
        cargo = c?.cargo ?? null;
      } else if (pedido.tipo === "website" || pedido.tipo === "linkedin_empresa") {
        const g = await buscarDadosEmpresaGoogle(alvo.nomeEmpresa ?? "");
        website = g?.website ?? null;
        linkedinEmpresa = g?.linkedin_url ?? null;
      }

      const encontrado =
        (telefones?.length ?? 0) > 0 || !!cargo || !!website || !!linkedinEmpresa;

      return {
        ...novo("serper", pedido, requestId, true, encontrado),
        confianca: encontrado ? 35 : 0,
        dados: { telefones, cargo, website, linkedinEmpresa },
      };
    } catch (e) {
      return novo("serper", pedido, requestId, false, false, e instanceof Error ? e : undefined);
    }
  },
};
