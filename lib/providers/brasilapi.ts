import { buscarDadosCnpj, buscarWebsitePorCnpj } from "../enriquecimento";
import type { Alvo, EmailEncontrado, Pedido, Provider, ResultadoProvider, TelefoneEncontrado } from "../enrichment/types";

// Brasil API — dados cadastrais, e-mail institucional, sócios, telefone
// (geral) e website (guess de domínio a partir do CNPJ).
export const brasilapiProvider: Provider = {
  nome: "brasilapi",
  suporta: ["dados_cadastrais", "email", "socios", "telefone", "website"],
  timeoutMs: 6000,

  async enrich(pedido, alvo): Promise<ResultadoProvider> {
    const requestId = `${pedido.tipo}:${alvo.chave ?? alvo.cnpj ?? ""}`;
    try {
      const telefones: TelefoneEncontrado[] = [];
      const emails: EmailEncontrado[] = [];
      const cadastrais: Record<string, unknown> = {};
      let socios: string[] | undefined;
      let website: string | null = null;

      if (pedido.tipo !== "website" || alvo.cnpj) {
        const cnpj = alvo.cnpj ?? "";
        if (cnpj) {
          const d = await buscarDadosCnpj(cnpj);
          if (d.telefone) telefones.push({ numero: d.telefone, tipo: "company", fonte: "brasil_api", confianca: 50 });
          if (d.telefone2) telefones.push({ numero: d.telefone2, tipo: "company", fonte: "brasil_api", confianca: 45 });
          if (d.email) emails.push({ email: d.email, tipo: "verificado", confianca: 50 });
          if (d.razaoSocial) cadastrais.razao_social = d.razaoSocial;
          if (d.socios?.length) socios = d.socios;
        }
      }

      if (pedido.tipo === "website" && alvo.cnpj) {
        const w = await buscarWebsitePorCnpj(alvo.cnpj);
        website = w?.website ?? w?.dominio ?? null;
      }

      const encontrado =
        telefones.length > 0 || emails.length > 0 || Object.keys(cadastrais).length > 0 || !!website || (socios?.length ?? 0) > 0;

      // e-mail verificado corresponde a dado institucional (não nota 100).
      const em = emails.map((e) => ({ ...e, confianca: 50 }));      return {
        provider: "brasilapi",
        requestId,
        ok: true,
        encontrado,
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "brasilapi",
        confianca: encontrado ? 50 : 0,
        dados: { telefones, emails: em, cadastrais, socios, website },
      };
    } catch (e) {
      return {
        provider: "brasilapi",
        requestId,
        ok: false,
        encontrado: false,
        erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "brasilapi",
        confianca: 0,
      };
    }
  },
};
