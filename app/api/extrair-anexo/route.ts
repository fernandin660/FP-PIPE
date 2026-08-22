import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

async function extrairDeImagem(
  bytes: ArrayBuffer,
  chave: string
): Promise<string> {
  const base64 = Buffer.from(bytes).toString("base64");

  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Esta imagem faz parte do portfólio de uma empresa (print de site, slide, catálogo, diagrama etc.). Extraia e resuma em português, em até 200 palavras: o que a empresa vende, serviços/produtos citados, público-alvo e diferenciais. Responda apenas o texto corrido.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!resposta.ok) throw new Error(`Erro da OpenAI: ${resposta.status}`);

  const dados = await resposta.json();
  return dados.choices[0].message.content ?? "";
}

async function extrairDePdf(
  bytes: ArrayBuffer,
  chave: string
): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const resultado = await pdfParse(Buffer.from(bytes));
  const texto = (resultado.text || "").replace(/\s+/g, " ").trim();

  if (!texto) return "";

  // Resume com a IA para caber no orçamento de tokens dos prompts
  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Você é um analista comercial. Responda SEMPRE apenas com JSON válido.",
        },
        {
          role: "user",
          content: `O texto abaixo é um documento do portfólio de uma empresa. Resuma em português, em até 200 palavras, o que a empresa vende: produtos/serviços, público-alvo e diferenciais.

TEXTO:
${texto.slice(0, 12000)}

Responda apenas: {"resumo":"..."}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!resposta.ok) throw new Error(`Erro da OpenAI: ${resposta.status}`);

  const dados = await resposta.json();
  const parsed = JSON.parse(dados.choices[0].message.content) as {
    resumo?: string;
  };
  return parsed.resumo ?? "";
}

export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const url: string = typeof corpo.url === "string" ? corpo.url : "";
    const tipo: string = typeof corpo.tipo === "string" ? corpo.tipo : "";

    if (!url || !["pdf", "imagem"].includes(tipo)) {
      return NextResponse.json(
        { erro: "Anexo inválido." },
        { status: 400 }
      );
    }

    const arquivo = await fetch(url, { signal: AbortSignal.timeout(30000) });

    if (!arquivo.ok) {
      return NextResponse.json(
        { erro: "Não conseguimos baixar o anexo." },
        { status: 400 }
      );
    }

    const bytes = await arquivo.arrayBuffer();

    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { erro: "Arquivo maior que 10 MB." },
        { status: 400 }
      );
    }

    const chave = process.env.OPENAI_API_KEY;
    if (!chave) {
      return NextResponse.json(
        { erro: "Chave da OpenAI não configurada." },
        { status: 500 }
      );
    }

    const texto =
      tipo === "pdf"
        ? await extrairDePdf(bytes, chave)
        : await extrairDeImagem(bytes, chave);

    return NextResponse.json({ texto });
  } catch (erroExtracao) {
    console.error("Erro ao extrair anexo:", erroExtracao);
    return NextResponse.json(
      { erro: "Não conseguimos ler este anexo. Tente outro formato." },
      { status: 500 }
    );
  }
}
