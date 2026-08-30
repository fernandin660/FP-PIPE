import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { registrarUso } from "../../../lib/avisos";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const URL_GEMINI =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const INSTRUCAO_EXTRACAO =
  "Esta imagem faz parte do portfólio de uma empresa (print de site, slide, catálogo, diagrama etc.). Extraia e resuma em português, em até 200 palavras: o que a empresa vende, serviços/produtos citados, público-alvo e diferenciais. Responda apenas o texto corrido.";

const INSTRUCAO_EXTRACAO_PDF =
  "O arquivo anexo é um documento do portfólio de uma empresa. Extraia e resuma em português, em até 200 palavras: o que a empresa vende, produtos/serviços citados, público-alvo e diferenciais. Responda apenas o texto corrido.";

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
              text: INSTRUCAO_EXTRACAO,
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
    signal: AbortSignal.timeout(40000),
  });

  if (!resposta.ok) throw new Error(`Erro da OpenAI: ${resposta.status}`);

  const dados = await resposta.json();
  return dados.choices[0].message.content ?? "";
}

async function extrairDePdf(
  bytes: ArrayBuffer,
  chave: string
): Promise<string> {
  // Leitura nativa de PDF da OpenAI (input_file): funciona com PDFs
  // de texto E escaneados/imagem, sem depender de libs locais.
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
              text: INSTRUCAO_EXTRACAO_PDF,
            },
            {
              type: "file",
              file: {
                filename: "portfolio.pdf",
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(40000),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("OpenAI PDF falhou:", resposta.status, detalhe.slice(0, 300));
    throw new Error(`Erro da OpenAI: ${resposta.status}`);
  }

  const dados = await resposta.json();
  return dados.choices[0].message.content ?? "";
}

// Plano B multimodal: Gemini lê imagem e PDF via inline_data.
async function extrairComGemini(
  bytes: ArrayBuffer,
  tipo: "pdf" | "imagem"
): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("Chave do Gemini não configurada.");

  void registrarUso("gemini");

  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = tipo === "pdf" ? "application/pdf" : "image/jpeg";

  const resposta = await fetch(
    `${URL_GEMINI}?key=${encodeURIComponent(chave)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  tipo === "pdf"
                    ? INSTRUCAO_EXTRACAO_PDF
                    : INSTRUCAO_EXTRACAO,
              },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
      }),
      signal: AbortSignal.timeout(40000),
    }
  );

  if (!resposta.ok) {
    throw new Error(`Erro do Gemini: ${resposta.status}`);
  }

  const dados = (await resposta.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const texto =
    dados.candidates?.[0]?.content?.parts
      ?.map((parte) => parte.text ?? "")
      .join("") ?? "";

  if (!texto) throw new Error("Gemini respondeu vazio.");
  return texto;
}

export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }

    const corpo = await request.json();

    const url: string = typeof corpo.url === "string" ? corpo.url : "";
    const tipo: string = typeof corpo.tipo === "string" ? corpo.tipo : "";

    if (!url || !["pdf", "imagem"].includes(tipo)) {
      return NextResponse.json(
        { erro: "Anexo inválido." },
        { status: 400 }
      );
    }

    // Anti-SSRF: só http(s) público, nunca rede interna/metadata.
    let alvo: URL;
    try {
      alvo = new URL(url);
    } catch {
      return NextResponse.json({ erro: "Anexo inválido." }, { status: 400 });
    }
    const host = alvo.hostname.toLowerCase();
    const hostBloqueado =
      ["localhost", "0.0.0.0", "169.254.169.254", "metadata.google.internal"].includes(
        host
      ) ||
      host === "::1" ||
      host.endsWith(".internal") ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    if (alvo.protocol !== "https:" && alvo.protocol !== "http:") {
      return NextResponse.json({ erro: "URL não permitida." }, { status: 400 });
    }
    if (hostBloqueado) {
      return NextResponse.json({ erro: "URL não permitida." }, { status: 400 });
    }

    const arquivo = await fetch(alvo.toString(), {
      signal: AbortSignal.timeout(30000),
      redirect: "follow",
    });

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

    // Cadeia: OpenAI primeiro; se cair, Gemini lê o anexo.
    let texto: string;
    try {
      void registrarUso("openai");
      texto =
        tipo === "pdf"
          ? await extrairDePdf(bytes, chave)
          : await extrairDeImagem(bytes, chave);
    } catch (erroOpenai) {
      console.warn(
        "Extração via OpenAI falhou, tentando Gemini:",
        erroOpenai instanceof Error ? erroOpenai.message : erroOpenai
      );
      texto = await extrairComGemini(
        bytes,
        tipo === "pdf" ? "pdf" : "imagem"
      );
    }

    return NextResponse.json({ texto });
  } catch (erroExtracao) {
    console.error("Erro ao extrair anexo:", erroExtracao);
    return NextResponse.json(
      { erro: "Não conseguimos ler este anexo. Tente outro formato." },
      { status: 500 }
    );
  }
}
