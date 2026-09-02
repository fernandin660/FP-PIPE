import { sugerirEmails, sugerirEmailsEmpresa } from "../enriquecimento";
import type { Alvo, EmailEncontrado, Pedido, Provider, ResultadoProvider } from "../enrichment/types";

// Padrões determinísticos de e-mail — SÓ sugestões (nunca "verificado").
// Nunca devem ser tratados como sucesso de e-mail (apenas candidatos).
export const patternsProvider: Provider = {
  nome: "patterns",
  suporta: ["email"],
  timeoutMs: 2000,

  async enrich(pedido, alvo): Promise<ResultadoProvider> {
    const requestId = `${pedido.tipo}:${alvo.chave ?? ""}`;
    try {
      const emails: EmailEncontrado[] = [];
      let sugestoes: string[] = [];
      if (pedido.tipo === "email") {
        sugestoes = alvo.nome && alvo.dominio
          ? sugerirEmails(alvo.nome, alvo.dominio)
          : alvo.dominio
            ? sugerirEmailsEmpresa(alvo.dominio)
            : [];
        for (const e of sugestoes) emails.push({ email: e, tipo: "sugerido", confianca: 15 });
      }
      const encontrado = emails.length > 0;
      return {
        provider: "patterns",
        requestId,
        ok: true,
        encontrado,
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "patterns",
        confianca: encontrado ? 15 : 0,
        dados: { emails },
      };
    } catch (e) {
      return {
        provider: "patterns",
        requestId,
        ok: false,
        encontrado: false,
        erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "patterns",
        confianca: 0,
      };
    }
  },
};
