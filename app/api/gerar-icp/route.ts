import http from "http";

import { exigirAcesso } from "../../../lib/gate";
import { conhecimentoSegmentos } from "../../../lib/conhecimento-segmentos";
import { chamarIa } from "../../../lib/ia";

export const runtime = "nodejs";

function chamarOllama(prompt: string): Promise<{ response: string }> {
  return new Promise<{ response: string }>((resolve, reject) => {
    const body = JSON.stringify({
      model: "llama3.2:3b",
      prompt,
      stream: false,
      format: "json",
      keep_alive: "30m",
      options: {
        temperature: 0.3,
        num_predict: 1300,
      },
    });

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 11434,
        path: "/api/generate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk.toString();
        });

        res.on("end", () => {
          try {
            const resultado = JSON.parse(data);

            if (res.statusCode && res.statusCode >= 400) {
              reject(
                new Error(
                  resultado.error ||
                    "Não conseguimos concluir a análise agora. Tente novamente."
                )
              );
              return;
            }

            resolve(resultado);
          } catch {
            reject(
              new Error(
                "Não conseguimos concluir a análise agora. Tente novamente."
              )
            );
          }
        });
      }
    );

    req.on("error", (erro) => {
      reject(erro);
    });

    req.setTimeout(600000, () => {
      req.destroy(
        new Error("O Ollama demorou mais de 10 minutos.")
      );
    });

    req.write(body);
    req.end();
  });
}

async function buscarTextoSite(urlEntrada: string): Promise<string> {
  try {
    let url = urlEntrada.trim();

    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    const controle = new AbortController();
    const temporizador = setTimeout(() => controle.abort(), 10000);

    const resposta = await fetch(url, {
      signal: controle.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(temporizador);

    if (!resposta.ok) return "";

    const html = await resposta.text();

    const texto = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return texto.slice(0, 1500);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }

    const {
      nomeEmpresa,
      produto,
      areaAtuacao,
      departamentoUso = "",
      produtosServicos,
      siteEmpresa,
      nichosSelecionados = [],
      porteEmpresa = [],
      faixaFuncionarios = [],
      tipoLocalizacao,
      estadoSelecionado,
      cidade,
      segmentosSelecionados = [] as string[],
    } = await request.json();

    const conteudoSite = siteEmpresa
      ? await buscarTextoSite(siteEmpresa)
      : "";

    const listaSegmentos = (segmentosSelecionados ?? []) as string[];

    const blocosConhecimento = listaSegmentos
      .map((segmento) => {
        const conteudo = conhecimentoSegmentos[segmento];
        return conteudo ? `=== ${segmento} ===\n${conteudo}` : "";
      })
      .filter(Boolean)
      .join("\n\n");

    const prompt = `
Você é um especialista em prospecção B2B e inteligência comercial no Brasil.

Crie um perfil de cliente ideal (ICP) usando estas informações:

=== NOSSA EMPRESA (QUEM VENDE) ===

Nome da nossa empresa: ${nomeEmpresa || "Não informado"}

Área de atuação: ${areaAtuacao || produto || "Não informado"}

Departamento que USA o nosso produto e influencia a compra: ${departamentoUso || "Não informado — inferir pela natureza do produto"}

Nichos:
${nichosSelecionados.join(", ") || "Não informado"}

Produtos e serviços que vendemos:
${produtosServicos || "Não informado"}

Site: ${siteEmpresa || "Não informado"}
${conteudoSite ? `\nConteúdo do site (use como contexto sobre nossa história e soluções):\n${conteudoSite}\n` : ""}
=== CLIENTE QUE QUEREMOS ALCANÇAR ===

Tipo de cliente: B2B (apenas empresas)

Porte das empresas-alvo:
${porteEmpresa.join(", ") || "Não informado"}

Faixa de funcionários:
${faixaFuncionarios.join(", ") || "Não informado"}

Localização:
${tipoLocalizacao || "Não informado"}${estadoSelecionado ? ` - ${estadoSelecionado}` : ""}${cidade ? ` - ${cidade}` : ""}

Segmentos-alvo:
${segmentosSelecionados.join(", ") || "Não informado"}
${blocosConhecimento ? `\nBASE DE CONHECIMENTO — SEGMENTOS SELECIONADOS (use como fonte principal de tipos de empresa e porte):\n\n${blocosConhecimento}\n` : ""}
REGRAS IMPORTANTES:

1. tipos_de_empresa: liste DE 8 A 10 tipos CONCRETOS e diferentes entre si, escolhidos preferencialmente da BASE DE CONHECIMENTO acima (combine as categorias e exemplos listados nela). Se a base não cobrir o segmento, use seu próprio conhecimento. NUNCA use categorias genéricas como "grandes empresas" ou o nome do segmento sozinho.

2. decisores: cargos com poder de DECISÃO final de compra, baseados SEMPRE no campo "O que sua empresa vende" (produtos e serviços informados), ajustados ao porte. REGRA DE OURO DO DEPARTAMENTO: se o campo "Departamento que USA o produto" estiver informado, os decisores são SEMPRE cargos SENIORES DESSE DEPARTAMENTO (quem o lidera e quem aprova o orçamento dele) — INDEPENDENTE da área de atuação da nossa empresa. Ex.: produto de software usado pelo Comercial/Vendas -> decisores são Gerente Comercial, Diretor de Vendas, Head de Growth; NUNCA Gerente de TI só porque é software. Só vá para TI/Outro departamento se o próprio campo indicar, ou se o produto for infraestrutura técnica consumida por TI. Quando o departamento NÃO for informado, pergunte-se: "dentro da empresa cliente, QUEM usa este produto no dia a dia e quem aprova a compra para esse uso?" Em empresa pequena o decisor é o dono ou sócio.

3. influenciadores: cargos que PESAM na decisão mas não decidem sozinhos — quem pesquisa, testa e recomenda a compra. Sob a MESMA REGRA DE OURO DO DEPARTAMENTO: cargos OPERACIONAIS/INTERMEDIÁRIOS do departamento de uso do produto (ex.: produto comercial -> SDR, BDR, Analista de Vendas, Coordenação Comercial). Nunca pule para outro departamento sem justificativa clara no produto.

4. principais_dores: dores CONCRETAS e específicas que o nosso produto/serviço resolve para essas empresas.

5. estrategia_abordagem: em 2 ou 3 frases, como chegar a esses clientes e qual gancho usar.

6. email_prospeccao: escreva o e-mail seguindo EXATAMENTE este modelo da nossa empresa, preenchendo com os dados informados acima:

"[Nome], bom dia/boa tarde. Tudo bem?

Sou o [Seu Nome] da [Nossa Empresa], especialista em [nossa especialidade principal] há mais de [X anos].

[Ponto de conexão com o lead - escolha UM plausível e deixe entre colchetes para o SDR ajustar. Exemplos: "Falei com a [fulana] na recepção hoje mais cedo e ela me pediu que falasse com você." / "Nos conectamos aqui no LinkedIn semana passada." / "Trocamos ideia no evento [nome] mês passado."]

A [Nossa Empresa] atua no mercado atendendo clientes como [2 ou 3 tipos de cliente/cases compatíveis com nosso histórico].

Gostaria de conversar com você para entender seu cenário atual de [dor específica do segmento-alvo] e ver como podemos ajudar.

Podemos conversar 15 minutos via Teams essa semana?"

Regras: se o nome da nossa empresa estiver informado acima, use o nome real no lugar de [Nossa Empresa]; no máximo 120 palavras; linguagem comercial brasileira simples e humana; a dor citada deve fazer sentido para o segmento-alvo E ser resolvida pelos nossos produtos/serviços; assunto curto no formato "Cenário de [dor] na [área do lead]".

7. NÃO gere roteiro de ligação — o produto trabalha com e-mail personalizado por empresa.

LEMBRETE CRÍTICO: antes de montar as listas decisores e influenciadores, releia O QUE O USUÁRIO VENDE (produtos e serviços informados) e aplique a REGRA DE OURO DO DEPARTAMENTO da regra 2 — quando o departamento de uso estiver informado, ele MANDA MAIS que a área de atuação ou o segmento. Os cargos devem refletir QUEM COMPRA E USA ESSE PRODUTO dentro das empresas-alvo — NUNCA simplesmente os cargos típicos do dia a dia do segmento. Use a BASE DE CONHECIMENTO apenas para entender tipos e portes de empresa do segmento, nunca para copiar cargos dela. Cargos devem existir de fato no porte informado (numa empresa pequena não existe "Diretor de TI" — existe o dono ou o gerente que acumula a função). Nunca use cargos genéricos como "Gerente de Marketing".

Responda em português do Brasil.

Retorne APENAS um JSON válido:

{
  "resumo_icp": "",
  "tipos_de_empresa": [],
  "decisores": [],
  "influenciadores": [],
  "principais_dores": [],
  "estrategia_abordagem": "",
  "email_prospeccao": {
    "assunto": "",
    "mensagem": ""
  }
}
`;

    console.log("Gerando ICP...");

    let respostaIA: { response: string };

    try {
      respostaIA = await chamarIa(prompt, {
        maxTokens: 2500,
        temperature: 0.7,
        timeoutMs: 120000,
      });
      console.log("Resposta recebida da OpenAI!");
    } catch (erroOpenAI) {
      console.error(
        "OpenAI falhou:",
        erroOpenAI instanceof Error ? erroOpenAI.message : erroOpenAI
      );
      console.log("Usando Ollama local...");
      respostaIA = await chamarOllama(prompt);
      console.log("Resposta recebida do Ollama!");
    }

    const icp = JSON.parse(respostaIA.response);

    return Response.json({
      resultado: icp,
    });
  } catch (erro) {
    console.error("Erro ao gerar ICP:", erro);

    return Response.json(
      {
        erro:
          erro instanceof Error
            ? erro.message
            : "Erro ao gerar o ICP.",
      },
      {
        status: 500,
      }
    );
  }
}