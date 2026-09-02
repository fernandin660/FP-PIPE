import { buscarCnpjPorEmpresa } from "../enriquecimento";
import type { Alvo, Pedido, Provider, ResultadoProvider, TelefoneEncontrado } from "../enrichment/types";

// Casa dos Dados — CNPJ, razão/fantasia e telefone geral da empresa.
export const casadosdadosProvider: Provider = {
  nome: "casadosdados",
  suporta: ["dados_cadastrais", "telefone"],
  timeoutMs: 6000,

  async enrich(pedido, alvo): Promise<ResultadoProvider> {
    const requestId = `${pedido.tipo}:${alvo.chave ?? alvo.cnpj ?? ""}`;
    try {
      const telefones: TelefoneEncontrado[] = [];
      const cadastrais: Record<string, unknown> = {};

      if (pedido.tipo === "dados_cadastrais" || (pedido.tipo === "telefone" && alvo.nomeEmpresa)) {
        const c = await buscarCnpjPorEmpresa(alvo.nomeEmpresa ?? "");
        if (c.cnpj) cadastrais.cnpj = c.cnpj;
        if (c.razao_social) cadastrais.razao_social = c.razao_social;
        if (c.nome_fantasia) cadastrais.nome_fantasia = c.nome_fantasia;
        if (c.telefone) telefones.push({ numero: c.telefone, tipo: "company", fonte: "casa_dos_dados", confianca: 45 });
      }

      const encontrado = telefones.length > 0 || Object.keys(cadastrais).length > 0;
      return {
        provider: "casadosdados",
        requestId,
        ok: true,
        encontrado,
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "casadosdados",
        confianca: encontrado ? 45 : 0,
        dados: { telefones, cadastrais },
      };
    } catch (e) {
      return {
        provider: "casadosdados",
        requestId,
        ok: false,
        encontrado: false,
        erro: { codigo: "error", mensagem: e instanceof Error ? e.message : "erro" },
        creditoConsumido: 0,
        custoEstimado: 0,
        moeda: "credito",
        cacheHit: false,
        fonte: "casadosdados",
        confianca: 0,
      };
    }
  },
};
