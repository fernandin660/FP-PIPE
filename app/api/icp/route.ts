import { registrarUso } from "../../../lib/avisos";
import { exigirAcesso } from "../../../lib/gate";

async function chamarOpenAI(prompt: string): Promise<{ response: string }> {
  if (process.env.USAR_OPENAI !== "true") {
    throw new Error("OpenAI desativada (USAR_OPENAI != true).");
  }

  const chave = process.env.OPENAI_API_KEY;
  if (!chave) throw new Error("Chave da OpenAI não configurada.");

  void registrarUso("openai");

  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Você é um consultor comercial especialista em prospecção B2B no Brasil. Responda SEMPRE apenas com JSON válido, sem texto fora do JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!resposta.ok) {
    throw new Error(`Erro da OpenAI: ${resposta.status}`);
  }

  const dados = await resposta.json();
  return { response: dados.choices[0].message.content };
}

export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }

    const { produto, produtosServicos } = await request.json();

    const prompt = `
Você trabalha como um consultor comercial.

Sua tarefa é ajudar o dono de uma empresa a identificar QUAL É O NICHO EXATO do negócio dele.

O usuário informará apenas uma área ampla.

Exemplo:

Área: Transporte

Boas sugestões seriam:
- Transporte para e-commerce
- Logística de última milha
- Transportadora de cargas
- Transporte refrigerado
- Fretamento corporativo
- Transporte executivo
- Transporte escolar
- Transporte de cargas especiais
- Mudanças
- Logística para varejo

Ruins seriam:
- Gestão de rota
- Frota de veículos
- Serviços de armazenamento
- Logística
- Transporte

IMPORTANTE:

Sugira TIPOS DE EMPRESAS ou MODELOS DE NEGÓCIO.

Não sugira apenas categorias amplas, atividades internas ou funções.

Pergunte mentalmente:

"Uma empresa poderia se apresentar usando exatamente esse nome?"

Sugira entre 10 e 15 opções distintas.

Use linguagem comercial simples.

Retorne SOMENTE JSON válido.

Formato:

{
  "area_atuacao": "string",
  "nichos_sugeridos": [
    "string"
  ]
}

Área informada pelo usuário:

${produto}

Produtos e serviços que a empresa vende (use para refinar as sugestões):

${produtosServicos || "Não informado"}
`;

    let textoResposta: string;

    try {
      console.log("Analisando nichos...");

      const dados = await chamarOpenAI(prompt);

      textoResposta = dados.response;
      console.log("Resposta recebida da OpenAI!");
    } catch (erroIA) {
      console.error(
        "OpenAI falhou:",
        erroIA instanceof Error ? erroIA.message : erroIA
      );
      console.log("Usando Ollama local...");

      const resposta = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3.2:3b",
          keep_alive: "30m",
          prompt,
          stream: false,
          format: "json",
        }),
      });

      if (!resposta.ok) {
        throw new Error(`Erro do Ollama: ${resposta.status}`);
      }

      const dados = await resposta.json();

      textoResposta = dados.response;
      console.log("Resposta recebida do Ollama!");
    }

    return Response.json({
      resultado: textoResposta,
    });
  } catch (erro) {
    console.error(erro);

    return Response.json(
      {
        erro: "Não conseguimos concluir a análise agora. Tente novamente.",
      },
      {
        status: 500,
      }
    );
  }
}
