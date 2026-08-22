export async function POST(request: Request) {
  try {
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

    const chave = process.env.OPENAI_API_KEY;
    const usarOpenai = process.env.USAR_OPENAI === "true";

    if (!chave || !usarOpenai) {
      return Response.json(
        { erro: "IA não configurada neste ambiente." },
        { status: 503 }
      );
    }

    const resposta = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${chave}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Você é especialista em prospecção B2B no Brasil. Responda APENAS com JSON válido no formato {"nichos": ["..."]}.',
            },
            {
              role: "user",
              content: `
Empresa que vende:
Área de atuação: ${areaAtuacao || "(não informada)"}
Produtos/serviços: ${produtosServicos || "(não informado)"}

Liste de 5 a 8 nichos de clientes ALTAMENTE específicos onde esta oferta costuma converter melhor no Brasil.
Regras:
- Cada nicho deve combinar segmento + característica (porte, momento, dor), ex.: "Clínicas médicas de médio porte", "Indústrias alimentícias sem time interno de TI".
- Máximo 8 palavras por nicho.
- Nichos distintos entre si, ordenados do mais promissor ao menos.
`.trim(),
            },
          ],
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!resposta.ok) {
      throw new Error(`Erro da OpenAI: ${resposta.status}`);
    }

    const dados = await resposta.json();
    const conteudo = String(dados.choices?.[0]?.message?.content ?? "{}");

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
