import { NextResponse } from "next/server";

import { chamarIa } from "../../../lib/ia";
import { registrarUso } from "../../../lib/avisos";
import { exigirAcesso } from "../../../lib/gate";
import { exigirRateLimit } from "../../../lib/rate-limit";
import { emailValido, sanitizarEmail } from "../../../lib/emails";

const URL_BRASILAPI = "https://brasilapi.com.br/api/cnpj/v1";
const URL_MINHARECEITA = "https://minhareceita.org";
const MAX_EMPRESAS = 20;
const TAMANHO_LOTE_OPENAI = 5;
const CONCORRENCIA_ENRIQUECIMENTO = 5;

type EmpresaEntrada = { cnpj: string; razaoSocial: string };

type EmpresaEnriquecida = EmpresaEntrada & {
  cnaeDescricao?: string;
  porte?: string;
  capitalSocial?: number | null;
  dataAbertura?: string;
  endereco?: string;
  nomeFantasia?: string;
  telefone?: string | null;
  email?: string | null;
  decisorNome?: string | null;
  decisorCargo?: string | null;
};

type Socio = {
  nome_socio?: string;
  qualificacao_socio?: string;
};

function extrairDecisor(
  qsa: Socio[] | undefined
): { nome: string; cargo: string } | null {
  if (!Array.isArray(qsa) || qsa.length === 0) return null;

  const prioridades = ["Administrador", "Diretor", "Presidente", "Titular"];

  for (const prioridade of prioridades) {
    const achado = qsa.find((s) =>
      (s.qualificacao_socio ?? "").includes(prioridade)
    );
    if (achado?.nome_socio) {
      return {
        nome: achado.nome_socio,
        cargo: achado.qualificacao_socio ?? "",
      };
    }
  }

  const primeiro = qsa[0];
  return primeiro?.nome_socio
    ? {
        nome: primeiro.nome_socio,
        cargo: primeiro.qualificacao_socio ?? "",
      }
    : null;
}

async function enriquecer(cnpj: string): Promise<EmpresaEnriquecida> {
  const base: EmpresaEnriquecida = { cnpj, razaoSocial: "" };

  let dados: Record<string, unknown> | null = null;

  try {
    const respostaBrasilApi = await fetch(`${URL_BRASILAPI}/${cnpj}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (respostaBrasilApi.ok) {
      dados = await respostaBrasilApi.json();
    }
  } catch {
    // segue para fallback
  }

  if (!dados) {
    try {
      const respostaMinhaReceita = await fetch(
        `${URL_MINHARECEITA}/${cnpj}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (respostaMinhaReceita.ok) {
        dados = await respostaMinhaReceita.json();
      }
    } catch {
      return base;
    }
  }

  if (!dados) return base;

  const decisor = extrairDecisor(dados.qsa as Socio[] | undefined);

  const capitalBruto = dados.capital_social;
  const capitalSocial =
    typeof capitalBruto === "number"
      ? capitalBruto
      : typeof capitalBruto === "string" &&
          capitalBruto.trim() !== "" &&
          !isNaN(Number(capitalBruto))
        ? Number(capitalBruto)
        : null;

  const telefoneBruto = dados.ddd_telefone_1;
  const telefone2Bruto = dados.ddd_telefone_2;
  const emailBruto = dados.correio_eletronico;

  const telefonesUnicos = Array.from(
    new Set(
      [telefoneBruto, telefone2Bruto]
        .filter(
          (t): t is string => typeof t === "string" && t.trim().length > 0
        )
        .map((t) => t.trim())
    )
  );

  const enderecoStr = [
    [dados.logradouro, dados.numero]
      .filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0
      )
      .join(", "),
    typeof dados.bairro === "string" && dados.bairro.trim()
      ? dados.bairro.trim()
      : null,
    [dados.municipio, dados.uf]
      .filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0
      )
      .join("/"),
    typeof dados.cep === "string" && dados.cep.trim()
      ? `CEP ${dados.cep.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    cnpj,
    razaoSocial: (dados.razao_social as string) ?? "",
    cnaeDescricao: (dados.cnae_fiscal_descricao as string) ?? undefined,
    porte: (dados.porte as string) ?? undefined,
    capitalSocial,
    dataAbertura:
      typeof dados.data_inicio_atividade === "string"
        ? dados.data_inicio_atividade.slice(0, 10)
        : undefined,
    endereco: enderecoStr || undefined,
    nomeFantasia:
      typeof dados.nome_fantasia === "string" && dados.nome_fantasia.trim()
        ? dados.nome_fantasia.trim()
        : undefined,
    telefone: telefonesUnicos.length > 0 ? telefonesUnicos.join(" / ") : null,
    email: emailValido(emailBruto) ? (sanitizarEmail(emailBruto) ?? null) : null,
    decisorNome: decisor?.nome,
    decisorCargo: decisor?.cargo,
  };
}

// ===== PLANO B (sem IA): pontuação heurística determinística =====
// Usa só dados que já temos em mãos. Nunca falha, é instantânea.
type PontuacaoFallback = {
  score: number;
  motivo: string;
  cargoPrioritario: string;
  emailProspeccao: { assunto: string; mensagem: string } | null;
};

function pontuarHeuristico(
  e: EmpresaEnriquecida,
  segmentosAlvo: string[],
  portesAlvo: string[]
): PontuacaoFallback {
  const semAcento = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  let pontos = 40;
  const motivos: string[] = [];

  const textoEmpresa = semAcento(
    [e.razaoSocial, e.cnaeDescricao].filter(Boolean).join(" ")
  );

  const casaSegmento = segmentosAlvo.some((s) => {
    const alvo = semAcento(s);
    return (
      textoEmpresa.includes(alvo) ||
      alvo
        .split(/\s+/)
        .some((t) => t.length >= 4 && textoEmpresa.includes(t))
    );
  });
  if (casaSegmento) {
    pontos += 20;
    motivos.push("atividade alinhada ao segmento-alvo");
  }

  if (
    portesAlvo.length === 0 ||
    (e.porte &&
      portesAlvo.some(
        (p) =>
          semAcento(e.porte!).includes(semAcento(p)) ||
          semAcento(p).includes(semAcento(e.porte!))
      ))
  ) {
    pontos += 10;
    motivos.push("porte compatível");
  }

  const capital = e.capitalSocial ?? 0;
  if (capital >= 50000) {
    pontos += 10;
    motivos.push("capital social sólido");
  } else if (capital >= 20000) {
    pontos += 5;
    motivos.push("capital social adequado");
  }

  const anos = e.dataAbertura
    ? Math.floor(
        (Date.now() - new Date(e.dataAbertura).getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : 0;
  if (anos >= 5) {
    pontos += 10;
    motivos.push("empresa estabelecida há anos");
  } else if (anos >= 2) {
    pontos += 5;
    motivos.push("maturidade moderada");
  }

  if (e.telefone || e.email) {
    pontos += 10;
    motivos.push("contato público disponível");
  }

  return {
    score: Math.max(0, Math.min(100, pontos)),
    motivo: `Estimativa automática (IA indisponível): ${
      motivos.join(", ") || "critérios básicos"
    }.`,
    cargoPrioritario: "",
    emailProspeccao: null,
  };
}

export async function POST(request: Request) {
  const bloqueado = await exigirRateLimit(request, "pontuar-empresas", 20, 60);
  if (bloqueado) return bloqueado;

  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }

    const dados = await request.json();

    const icpResumo: string =
      typeof dados.icp === "string" ? dados.icp : "";

    const perfilVendedor: string =
      typeof dados.perfilVendedor === "string"
        ? dados.perfilVendedor.trim()
        : "";

    const cargosPrioritarios: string[] = Array.isArray(dados.cargosPrioritarios)
      ? dados.cargosPrioritarios
          .filter(
            (c: unknown): c is string =>
              typeof c === "string" && c.trim().length > 0
          )
          .slice(0, 10)
      : [];

    // Contexto para o plano B (score heurístico sem IA).
    const segmentosAlvo: string[] = Array.isArray(dados.segmentos)
      ? dados.segmentos.filter(
          (s: unknown): s is string => typeof s === "string"
        )
      : [];
    const portesAlvo: string[] = Array.isArray(dados.portes)
      ? dados.portes.filter(
          (p: unknown): p is string => typeof p === "string"
        )
      : [];

    const empresas: EmpresaEntrada[] = Array.isArray(dados.empresas)
      ? dados.empresas
          .filter(
            (e: unknown): e is EmpresaEntrada =>
              typeof e === "object" &&
              e !== null &&
              typeof (e as EmpresaEntrada).cnpj === "string"
          )
          .map((e: EmpresaEntrada) => ({
            cnpj: e.cnpj.replace(/\D/g, ""),
            razaoSocial: e.razaoSocial ?? "",
          }))
      : [];

    if (!icpResumo || empresas.length === 0) {
      return NextResponse.json(
        { erro: "Informe o ICP e a lista de empresas." },
        { status: 400 }
      );
    }

    const selecionadas = empresas.slice(0, MAX_EMPRESAS);

    const enriquecidas: EmpresaEnriquecida[] = new Array(
      selecionadas.length
    );
    let indiceEnriquecimento = 0;

    async function worker() {
      while (indiceEnriquecimento < selecionadas.length) {
        const atual = indiceEnriquecimento;
        indiceEnriquecimento += 1;
        enriquecidas[atual] = await enriquecer(selecionadas[atual].cnpj);
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(CONCORRENCIA_ENRIQUECIMENTO, selecionadas.length) },
        () => worker()
      )
    );

    const mapaAvaliacoes = new Map<
      string,
      {
        score: number;
        motivo: string;
        cargoPrioritario: string;
        emailProspeccao: { assunto: string; mensagem: string } | null;
      }
    >();

    async function avaliarLote(lote: EmpresaEnriquecida[]) {
      const listaEmpresas = lote
        .map((e, idx) => {
          const partes = [
            `${idx + 1}. CNPJ ${e.cnpj}`,
            e.razaoSocial ? `Razão social: ${e.razaoSocial}` : null,
            e.cnaeDescricao ? `Atividade: ${e.cnaeDescricao}` : null,
            e.porte ? `Porte: ${e.porte}` : null,
            e.capitalSocial !== null && e.capitalSocial !== undefined
              ? `Capital social: R$ ${e.capitalSocial}`
              : null,
            e.dataAbertura ? `Aberta em: ${e.dataAbertura}` : null,
          ].filter(Boolean);
          return partes.join(" | ");
        })
        .join("\n");

      const criterioCargo = cargosPrioritarios.length
        ? `CRITÉRIO DO CARGO PRIORITÁRIO (o "campeão") — REGRA ABSOLUTA:
O usuário JÁ ESCOLHEU os cargos-alvo, nesta ordem de prioridade:
${cargosPrioritarios.map((c, i) => `${i + 1}. ${c}`).join("\n")}

1. O campo "cargo_prioritario" DEVE ser um destes cargos, escrito EXATAMENTE como na lista acima. NUNCA invente outro cargo.
2. Escolha o PRIMEIRO cargo da lista que provavelmente existe na estrutura dessa empresa (empresas pequenas têm menos níveis hierárquicos).
3. Se nenhuma fizer sentido para a empresa, escolha mesmo assim o último da lista mais próximo da operação dela.
4. Nunca sugira dono/sócio como campeão.`
        : `CRITÉRIO DO CARGO PRIORITÁRIO (o "campeão") — SIGA ESTA ORDEM RÍGIDA:
1. REGRA DE OURO: se o que meu cliente vende envolve tecnologia, software, cibersegurança, infraestrutura, cloud, dados ou automação, o campeão é SEMPRE o líder de TI da empresa-alvo (ex.: "Gerente de TI", "Coordenador de TI"), INDEPENDENTE do segmento em que ela atua.
2. Somente se o produto NÃO for relacionado a TI: escolha o líder funcional do dia a dia no segmento da empresa que mais sofre a dor que meu cliente resolve (ex.: produto de gestão de frota numa transportadora -> "Gerente de Frota").
3. Nunca sugira dono/sócio como campeão (o dono é quem aprova depois).
4. Responda apenas o cargo curto (ex.: "Gerente de TI").`;

      const criterioEmail = `E-MAIL DE PROSPECÇÃO PERSONALIZADO (campo "email_prospeccao") — para cada empresa, escreva um PRIMEIRO e-mail pronto para copiar e colar:
1. Saudação: use o nome do decisor/aprovador quando houver sócio identificado nos dados (ex.: "Roberto, bom dia. Tudo bem?"); se não houver nome, use "Olá, time da [nome da empresa]". NUNCA invente nomes próprios que não estejam nos dados.
2. Primeiro parágrafo: UM gancho específico desta empresa — cite o nome dela e conecte com segmento/atividade/porte/maturidade (gatilho observável, sem inventar fatos).
3. Segundo parágrafo: conecte O QUE MEU CLIENTE VENDE (ICP acima) com a dor concreta que isso resolve no dia a dia DESSA empresa. CITE a categoria da solução em palavras simples (ex.: "monitoramento de ameaças cibernéticas", "telemetria de frota"). PROIBIDO clichês vagos como "eficiência operacional", "otimizar processos" ou "potencializar resultados" se não estiverem diretamente ligados ao que meu cliente vende; seja específico da operação real dela (frigorífico -> rastreabilidade de lote e paradas de linha; transportadora -> custo por km e manutenção).
4. Fechamento: convite leve de 15 minutos ("Podemos conversar 15 minutos essa semana?").
5. Sem markdown, sem placeholders entre colchetes, máximo 120 palavras, texto corrido em português comercial brasileiro simples e humano. Assunto curto (máx. 60 caracteres) citando a empresa ou a dor.
6. NÃO confunda o DOMÍNIO DO PRODUTO com o SEGMENTO da empresa-alvo: se meu cliente vende cibersegurança e a alvo é um frigorífico, a dor é proteger os dados e sistemas DO frigorífico — nunca transforme o tema do segmento em oferta (ex.: jamais escreva "segurança alimentar" como se fosse o que vendemos).`;

      const prompt = `PERFIL DO CLIENTE IDEAL (ICP) DO MEU CLIENTE:
${icpResumo}
${
  perfilVendedor
    ? `
QUEM VENDE (perfil real da empresa que usa a plataforma — use como fonte principal do que é vendido):
${perfilVendedor}`
    : ""
}

EMPRESAS CANDIDATAS (dados públicos da Receita Federal):
${listaEmpresas}

TAREFA: Para cada empresa acima, calcule um SCORE DE ADERÊNCIA de 0 a 100 indicando o quanto ela combina com o ICP descrito, identifique o CARGO PRIORITÁRIO para a abordagem comercial e escreva um E-MAIL DE PROSPECÇÃO personalizado.

CRITÉRIOS DE SCORE:
- Alinhamento entre a atividade (CNAE) da empresa e os segmentos/nichos do ICP (peso maior).
- Compatibilidade do porte da empresa com o porte-alvo do ICP.
- Maturidade: empresas com mais tempo de mercado tendem a ser melhores alvos B2B.
- Capacidade de investimento estimada pelo capital social.

${criterioCargo}

${criterioEmail}

RESPONDA APENAS COM ESTE FORMATO JSON:
{"avaliacoes":[{"cnpj":"numero_cnpj_apenas_digitos","score":75,"motivo":"uma frase curta em português explicando o potencial desta empresa PARA ESTE cliente específico","cargo_prioritario":"ex.: Gerente de TI","email_prospeccao":{"assunto":"assunto curto","mensagem":"corpo completo do e-mail"}}]}`;

      const resposta = await chamarIa(prompt, {
        maxTokens: 4000,
        temperature: 0.4,
        timeoutMs: 45000,
      });

      try {
        const parsed = JSON.parse(resposta.response) as {
          avaliacoes?: Array<{
            cnpj?: string;
            score?: number;
            motivo?: string;
            cargo_prioritario?: string;
            email_prospeccao?: {
              assunto?: string;
              mensagem?: string;
            } | null;
          }>;
        };

        if (Array.isArray(parsed.avaliacoes)) {
          for (const a of parsed.avaliacoes) {
            if (!a.cnpj) continue;
            const digitos = String(a.cnpj).replace(/\D/g, "");
            mapaAvaliacoes.set(digitos, {
              score:
                typeof a.score === "number"
                  ? Math.max(0, Math.min(100, Math.round(a.score)))
                  : 0,
              motivo: a.motivo ?? "",
              cargoPrioritario: a.cargo_prioritario ?? "",
              emailProspeccao: a.email_prospeccao
                ? {
                    assunto: a.email_prospeccao.assunto ?? "",
                    mensagem: a.email_prospeccao.mensagem ?? "",
                  }
                : null,
            });
          }
        }
      } catch {
        // Lote falhou no parse — segue com os demais lotes
      }
    }

    const lotes: EmpresaEnriquecida[][] = [];
    for (
      let i = 0;
      i < enriquecidas.length;
      i += TAMANHO_LOTE_OPENAI
    ) {
      lotes.push(enriquecidas.slice(i, i + TAMANHO_LOTE_OPENAI));
    }

    const resultadosLotes = await Promise.allSettled(
      lotes.map((lote) => avaliarLote(lote))
    );

    // ===== PLANO B: score heurístico sem IA =====
    // Se a OpenAI falhar (cota, instabilidade, JSON truncado), nenhum
    // usuário fica sem pontuação: estimamos com os dados enriquecidos.
    const falhaTotalIA =
      mapaAvaliacoes.size === 0 && enriquecidas.length > 0;

    if (mapaAvaliacoes.size < enriquecidas.length) {
      for (const e of enriquecidas) {
        if (mapaAvaliacoes.has(e.cnpj)) continue;
        mapaAvaliacoes.set(e.cnpj, pontuarHeuristico(e, segmentosAlvo, portesAlvo));
      }
    }

    return NextResponse.json({
      avaliacoes: enriquecidas.map((e) => {
        const avaliacao = mapaAvaliacoes.get(e.cnpj);
        return {
          cnpj: e.cnpj,
          score: avaliacao?.score ?? null,
          motivo: avaliacao?.motivo ?? null,
          telefone: e.telefone ?? null,
          email: e.email ?? null,
          cnaeDescricao: e.cnaeDescricao ?? null,
          porte: e.porte ?? null,
          capitalSocial: e.capitalSocial ?? null,
          endereco: e.endereco ?? null,
          nomeFantasia: e.nomeFantasia ?? null,
          decisorNome: e.decisorNome ?? null,
          decisorCargo: e.decisorCargo ?? null,
          cargoPrioritario: mapaAvaliacoes.get(e.cnpj)?.cargoPrioritario ?? null,
          emailProspeccao:
            mapaAvaliacoes.get(e.cnpj)?.emailProspeccao ?? null,
        };
      }),
      totalAvaliadas: enriquecidas.length,
      modoFallback: falhaTotalIA,
    });
  } catch {
    return NextResponse.json(
      {
        erro:
          "Não conseguimos pontuar as empresas agora. Tente novamente em instantes.",
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
