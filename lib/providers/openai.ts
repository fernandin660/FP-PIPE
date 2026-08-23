const CHAVE_OPENAI = process.env.OPENAI_API_KEY ?? "";

export type RespostaJsonIA<Formato> = Formato | null;

export async function chamarOpenaiJson<Formato>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 900
): Promise<RespostaJsonIA<Formato>> {
  if (!CHAVE_OPENAI) throw new Error("Chave da OpenAI não configurada.");

  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHAVE_OPENAI}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!resposta.ok) {
    throw new Error(`Erro da OpenAI: ${resposta.status}`);
  }

  const dados = await resposta.json();
  const conteudo = dados?.choices?.[0]?.message?.content;

  if (typeof conteudo !== "string") return null;

  try {
    return JSON.parse(conteudo) as Formato;
  } catch {
    return null;
  }
}
