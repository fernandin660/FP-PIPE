import type { Alvo, Pedido, Provider, ResultadoProvider } from "../enrichment/types";

// Minha Receita (minhareceita.org) — base pública da Receita Federal (mirror).
// Retorna e-mail e telefones institucionais a partir do CNPJ.
// Provider GRATUITO. A sanitização/validação (emailValido, telefoneUtil)
// é aplicada no adapter (enriquecer-receita), preservando a regra atual.
export const minhareceitaProvider: Provider = {
  nome: "minhareceita",
  suporta: ["dados_cadastrais", "email", "telefone"],
  timeoutMs: 8000,

  async enrich(pedido: Pedido, alvo: Alvo): Promise<ResultadoProvider> {
    const cnpj = (alvo.cnpj ?? "").replace(/\D/g, "");
    const base: Omit<ResultadoProvider, "dados" | "fonte"> = {
      provider: "minhareceita",
      requestId: `${pedido.tipo}:${cnpj}`,
      ok: true,
      encontrado: false,
      creditoConsumido: 0,
      custoEstimado: 0,
      moeda: "credito",
      cacheHit: false,
      confianca: 0,
    };

    if (cnpj.length !== 14) {
      return {
        ...base,
        ok: false,
        erro: { codigo: "sem_cnpj", mensagem: "CNPJ inválido." },
        fonte: "minhareceita",
      };
    }

    try {
      const resposta = await fetch(
        `https://minhareceita.org/${encodeURIComponent(cnpj)}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!resposta.ok) {
        const notFound = resposta.status === 404;
        return {
          ...base,
          ok: false,
          erro: notFound
            ? { codigo: "not_found", mensagem: "CNPJ não encontrado na base pública." }
            : { codigo: "unavailable", mensagem: "Base da Receita indisponível no momento." },
          fonte: "minhareceita",
        };
      }

      const receita = (await resposta.json()) as {
        email?: string | null;
        ddd_telefone_1?: string | null;
        ddd_telefone_2?: string | null;
      };

      const email = typeof receita.email === "string" ? receita.email : null;
      const t1 = typeof receita.ddd_telefone_1 === "string" ? receita.ddd_telefone_1 : null;
      const t2 = typeof receita.ddd_telefone_2 === "string" ? receita.ddd_telefone_2 : null;

      const emails = email
        ? [{ email, tipo: "verificado" as const, confianca: 50 }]
        : [];
      const telefones = [t1, t2]
        .filter((n): n is string => Boolean(n))
        .map((n) => ({ numero: n, tipo: "company" as const, fonte: "minhareceita", confianca: 50 }));

      const encontrado = emails.length > 0 || telefones.length > 0;

      return {
        ...base,
        encontrado,
        confianca: encontrado ? 50 : 0,
        fonte: "minhareceita",
        dados: { emails, telefones, cadastrais: { cnpj } },
      };
    } catch (e) {
      return {
        ...base,
        ok: false,
        erro: { codigo: "error", mensagem: "Não foi possível falar com a base da Receita agora." },
        fonte: "minhareceita",
      };
    }
  },
};
