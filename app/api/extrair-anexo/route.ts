import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { registrarUso } from "../../../lib/avisos";

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
              text: 'O arquivo anexo é um documento do portfólio de uma empresa. Extraia e resuma em português, em até 200 palavras: o que a empresa vende, produtos/serviços citados, público-alvo e diferenciais. Responda apenas o texto corrido.',
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
    signal: AbortSignal.timeout(90000),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("OpenAI PDF falhou:", resposta.status, detalhe.slice(0, 300));
    throw new Error(`Erro da OpenAI: ${resposta.status}`);
  }

  const dados = await resposta.json();
  return dados.choices[0].message.content ?? "";
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

    void registrarUso("openai");

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
