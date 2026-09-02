import { buscarContatosNoSite } from "../enriquecimento";
import type { Alvo, EmailEncontrado, Pedido, Provider, ResultadoProvider, TelefoneEncontrado } from "../enrichment/types";

// Site scraping — e-mails PÚBLICOS (não verificados) e telefones gerais
// retirados do site da empresa. Inseguro classificar como pessoal.
export const siteProvider: Provider = {
  nome: "site",
  suporta: ["email", "telefone"],
  timeoutMs: 6000,

  async enrich(pedido, alvo): Promise<ResultadoProvider> {
    const requestId = `${pedido.tipo}:${alvo.chave ?? ""}`;
    try {
      const emails: EmailEncontrado[] = [];
      const telefones: TelefoneEncontrado[] = [];
      const site = alvo.website ?? alvo.dominio ?? "";
      if (site) {
        const d = await buscarContatosNoSite(site);
        for (const e of d.emails) emails.push({ email: e, tipo: "sugerido", confianca: 30 });
        for (const t of d.telefones) telefones.push({ numero: t, tipo: "company", fonte: "site", confianca: 30 });
      }
      const encontrado = emails.length > 0 || telefones.length > 0;
      return {
        provider: "site",
        requestId,
        ok: true,
        encontrado,
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "site",
        confianca: encontrado ? 30 : 0,
        dados: { emails, telefones },
      };
    } catch (e) {
      return {
        provider: "site",
        requestId,
        ok: false,
        encontrado: false,
        erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "site",
        confianca: 0,
      };
    }
  },
};
