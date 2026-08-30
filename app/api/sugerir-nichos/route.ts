import { exigirAcesso } from "../../../lib/gate";
import { chamarIa } from "../../../lib/ia";

export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }

    const { areaAtuacao = "", produtosServicos = "" } =
      await request.json();

    if (
      !String(areaAtuacao).trim() &&
      !String(produtosServicos).trim()
    ) {
      return Response.json(
        { erro: "Informe a área de atuação ou o que sua empresa vende." },
        { status: 400 }
      );
    }

    const resposta = await chamarIa(
      `
Empresa que vende:
Área de atuação: ${areaAtuacao || "(não informada)"}
Produtos/serviços: ${produtosServicos || "(não informado)"}

Gere de 6 a 10 itens curtos e clicáveis representando os serviços, especialidades e nichos desta empresa.
Regras:
- A maioria dos itens deve ser um SERVIÇO/OFERTA específica extraída ou inferida da descrição (ex.: "Gerenciamento de Endpoint", "Treinamento de usuários", "Gestão de vulnerabilidades").
- Inclua também 2 a 3 itens adjacentes óbvios que essa empresa provavelmente vende mas não citou.
- Máximo 6 palavras por item, começando com substantivo.
- Itens distintos entre si, ordenados do mais central ao mais complementar.

Responda APENAS com JSON válido no formato {"nichos": ["..."]}.
`.trim(),
      { maxTokens: 800, temperature: 0.7, timeoutMs: 25000 }
    );

    const conteudo = String(resposta.response ?? "{}");

    let nichos: string[] = [];

    try {
      const parsed = JSON.parse(conteudo) as { nichos?: unknown };

      if (Array.isArray(parsed.nichos)) {
        nichos = parsed.nichos
          .filter(
            (item): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
          .slice(0, 8);
      }
    } catch {
      nichos = [];
    }

    if (nichos.length === 0) {
      return Response.json(
        { erro: "Não conseguimos gerar sugestões agora." },
        { status: 502 }
      );
    }

    return Response.json({ nichos });
  } catch (erro) {
    console.error("Erro ao sugerir nichos:", erro);
    return Response.json(
      { erro: "Erro ao gerar sugestões de nichos." },
      { status: 500 }
    );
  }
}
