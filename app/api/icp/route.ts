import { exigirAcesso } from "../../../lib/gate";
import { chamarIa } from "../../../lib/ia";

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

      const dados = await chamarIa(prompt, {
        maxTokens: 800,
        temperature: 0.7,
        timeoutMs: 45000,
      });

      textoResposta = dados.response;
      console.log("Resposta recebida da OpenAI!");
    } catch (erroIA) {
      console.error(
        "OpenAI falhou:",
        erroIA instanceof Error ? erroIA.message : erroIA
      );

      // O Ollama roda apenas LOCALMENTE (127.0.0.1). Em produção (Vercel)
      // esse endpoint não existe; tentar cair nele penduraria a função e a
      // Cloudflare responderia 504. Em produção, falha rápido.
      const emProducao =
        process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
      if (emProducao) {
        throw new Error("IA indisponível no momento. Tente novamente.");
      }

      console.log("Usando Ollama local...");

      const controle = new AbortController();
      const temporizador = setTimeout(() => controle.abort(), 30000);

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
        signal: controle.signal,
      });

      clearTimeout(temporizador);

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
