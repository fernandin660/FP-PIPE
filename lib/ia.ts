import { registrarUso } from "./avisos";

const URL_OPENAI = "https://api.openai.com/v1/chat/completions";
const URL_GEMINI =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";

export type OpcoesIa = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type RespostaIa = {
  response: string;
  provedor: "openai" | "gemini" | "groq";
};

// Extrai um payload JSON robusto de respostas de IA: aceita JSON puro,
// cercado por fences de markdown ou com lixo de texto em volta. Retorna a
// string JSON canônica (parseável) ou null se nada válido existir.
export function extrairJson(texto: string): string | null {
  const entrada = texto.trim();
  try {
    JSON.parse(entrada);
    return entrada;
  } catch {
    // segue para os reparos
  }

  const semFence = entrada
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    JSON.parse(semFence);
    return semFence;
  } catch {
    // segue para o recorte
  }

  const inicio = semFence.indexOf("{");
  const fim = semFence.lastIndexOf("}");
  if (inicio >= 0 && fim > inicio) {
    const bloco = semFence.slice(inicio, fim + 1);
    try {
      JSON.parse(bloco);
      return bloco;
    } catch {
      // segue
    }
  }

  return null;
}

// Instrução injetada quando uma resposta sai truncada ou inválida.
const SUCESSO_JSON = `
IMPORTANTE: sua resposta anterior saiu truncada ou em formato inválido.
Retorne AGORA apenas um JSON completo e bem-formado, com todas as strings
fechadas e sem quebras de linha literais dentro dos valores. Sem texto
fora do JSON, sem markdown, sem comentários.`;

async function chamarOpenai(
  prompt: string,
  opcoes: Required<OpcoesIa>
): Promise<string> {
  if (process.env.USAR_OPENAI !== "true") {
    throw new Error("OpenAI desativada (USAR_OPENAI != true).");
  }

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) throw new Error("Chave da OpenAI não configurada.");

  void registrarUso("openai");

  const resposta = await fetch(URL_OPENAI, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: opcoes.temperature,
      max_tokens: opcoes.maxTokens,
    }),
    signal: AbortSignal.timeout(opcoes.timeoutMs),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error(
      "OpenAI falhou:",
      resposta.status,
      detalhe.slice(0, 200)
    );
    throw new Error(`Erro da OpenAI: ${resposta.status}`);
  }

  const dados = await resposta.json();
  const texto = String(dados?.choices?.[0]?.message?.content ?? "");
  if (!texto) throw new Error("OpenAI respondeu vazia.");
  return texto;
}

async function chamarGemini(
  prompt: string,
  opcoes: Required<OpcoesIa>
): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("Chave do Gemini não configurada.");

  void registrarUso("gemini");

  const resposta = await fetch(
    `${URL_GEMINI}?key=${encodeURIComponent(chave)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opcoes.temperature,
          maxOutputTokens: opcoes.maxTokens,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(opcoes.timeoutMs),
    }
  );

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error(
      "Gemini falhou:",
      resposta.status,
      detalhe.slice(0, 200)
    );
    throw new Error(`Erro do Gemini: ${resposta.status}`);
  }

  const dados = await resposta.json();
  const texto =
    dados?.candidates?.[0]?.content?.parts
      ?.map((parte: { text?: string }) => parte.text ?? "")
      .join("") ?? "";
  if (!texto) throw new Error("Gemini respondeu vazio.");
  return texto;
}

async function chamarGroq(
  prompt: string,
  opcoes: Required<OpcoesIa>
): Promise<string> {
  const chave = process.env.GROQ_API_KEY;
  if (!chave) throw new Error("Chave do Groq não configurada.");

  void registrarUso("groq");

  const resposta = await fetch(URL_GROQ, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: opcoes.temperature,
      max_tokens: opcoes.maxTokens,
    }),
    signal: AbortSignal.timeout(opcoes.timeoutMs),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error(
      "Groq falhou:",
      resposta.status,
      detalhe.slice(0, 200)
    );
    throw new Error(`Erro do Groq: ${resposta.status}`);
  }

  const dados = await resposta.json();
  const texto = String(dados?.choices?.[0]?.message?.content ?? "");
  if (!texto) throw new Error("Groq respondeu vazia.");
  return texto;
}

// Chamada a um provedor com auto-reparo: se o JSON sair truncado/inválido,
// tenta UMA vez de novo no MESMO provedor com instrução de corrigir. Só aí
// devolve erro para a cadeia seguir para o próximo provedor.
async function chamarComReparo(
  provedor: (prompt: string, opcoes: Required<OpcoesIa>) => Promise<string>,
  prompt: string,
  config: Required<OpcoesIa>
): Promise<string> {
  let texto = await provedor(prompt, config);
  const limpo = extrairJson(texto);
  if (limpo) return limpo;

  console.warn("Resposta JSON truncada/inválida; repetindo no mesmo provedor.");
  const textoReparado = await provedor(prompt + SUCESSO_JSON, {
    ...config,
    maxTokens: Math.max(config.maxTokens, 3200),
  });
  const limpoReparado = extrairJson(textoReparado);
  if (!limpoReparado) {
    throw new Error("provedor retornou JSON inválido/truncado.");
  }
  return limpoReparado;
}

// Cadeia única de IA do FP Pipe: Gemini primeiro (rápido e com camada
// gratuita generosa); se cair, Groq (gpt-oss-120b, também gratuito);
// OpenAI (paga) fica como ÚLTIMO recurso para reduzir custo. Todas as
// chamadas pedem JSON estruturado nos três provedores.
export async function chamarIa(
  prompt: string,
  opcoes?: OpcoesIa
): Promise<RespostaIa> {
  // Teto seguro: limita cada provedor a ~45s e o total a 55s (fecha
  // dentro do maxDuration=60 das rotas).
  const config: Required<OpcoesIa> = {
    maxTokens: opcoes?.maxTokens ?? 2500,
    temperature: opcoes?.temperature ?? 0.5,
    timeoutMs: Math.min(opcoes?.timeoutMs ?? 45000, 45000),
  };

  const LIMITE_TOTAL = 55000;
  let erroFinal: unknown;

  const inicio = Date.now();

  try {
    return {
      response: await chamarComReparo(chamarGemini, prompt, config),
      provedor: "gemini",
    };
  } catch (erroGemini) {
    erroFinal = erroGemini;
    console.warn(
      "Gemini indisponível, tentando Groq:",
      erroGemini instanceof Error ? erroGemini.message : erroGemini
    );
  }

  try {
    const restante = Math.max(10000, LIMITE_TOTAL - (Date.now() - inicio));
    return {
      response: await chamarComReparo(chamarGroq, prompt, {
        ...config,
        timeoutMs: restante,
      }),
      provedor: "groq",
    };
  } catch (erroGroq) {
    erroFinal = erroGroq;
    console.warn(
      "Groq indisponível, tentando OpenAI:",
      erroGroq instanceof Error ? erroGroq.message : erroGroq
    );
  }

  try {
    const restante = Math.max(15000, LIMITE_TOTAL - (Date.now() - inicio));
    return {
      response: await chamarComReparo(chamarOpenai, prompt, {
        ...config,
        timeoutMs: restante,
      }),
      provedor: "openai",
    };
  } catch (erroOpenai) {
    throw new Error(
      `Gemini, Groq e OpenAI indisponíveis (${String(erroOpenai ?? erroFinal).slice(0, 100)})`
    );
  }
}

