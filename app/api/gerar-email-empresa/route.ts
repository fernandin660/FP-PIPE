import { NextResponse } from "next/server";

import { limparNomeEmpresa } from "../../../lib/linkedin-links";
import { chamarIa } from "../../../lib/ia";
import { exigirAcesso } from "../../../lib/gate";

export const runtime = "nodejs";

type EmpresaEntrada = {
  razaoSocial?: string;
  nomeFantasia?: string;
  municipio?: string;
  uf?: string;
  endereco?: string;
  segmentoIcp?: string;
  porte?: string;
  capitalSocial?: number | null;
  decisorNome?: string | null;
  cargoPrioritario?: string | null;
  icpResumo?: string;
  perfilVendedor?: string;
};


export async function POST(request: Request) {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }

    const e: EmpresaEntrada = await request.json();

    const temIcp = Boolean(e.icpResumo?.trim());
    const temPerfil = Boolean(e.perfilVendedor?.trim());

    const nomeAmigavel =
      limparNomeEmpresa(e.nomeFantasia || e.razaoSocial || "") ||
      e.razaoSocial ||
      "";

    const partesContexto: string[] = [];

    if (temPerfil) {
      partesContexto.push(
        `QUEM VENDE (perfil da empresa que usa a plataforma — FONTE PRINCIPAL da oferta):
${e.perfilVendedor}`
      );
    }

    if (temIcp) {
      partesContexto.push(
        `ICP / CONTEXTO DESTA LISTA:
${e.icpResumo}`
      );
    }

    const contextoOferta =
      partesContexto.length > 0
        ? partesContexto.join("\n\n")
        : `ATENÇÃO: você NÃO sabe o que quem envia vende. NÃO invente produto ou serviço específico. Escreva o e-mail focado na realidade da empresa-alvo (gancho do segmento + dor provável) e convide para uma conversa de entendimento de cenário.`;

    const instrucaoSaudacao = e.decisorNome
      ? `1. Saudação: comece com "${e.decisorNome}, bom dia. Tudo bem?" — use EXATAMENTE este nome, é um dado real.`
      : `1. Saudação: comece EXATAMENTE com "Olá, time da ${nomeAmigavel}. Tudo bem?" — NÃO use nenhum nome próprio de pessoa, pois não temos contato identificado.`;

    const prompt = `${contextoOferta}

DADOS DA EMPRESA-ALVO (Receita Federal):
- Nome: ${nomeAmigavel}
- Razão social: ${e.razaoSocial || ""}
- Segmento/atividade: ${e.segmentoIcp || ""}
- Localização: ${e.endereco || [e.municipio, e.uf].filter(Boolean).join(", ") || ""}
${e.porte ? `- Porte: ${e.porte}` : ""}
${typeof e.capitalSocial === "number" ? `- Capital social: R$ ${e.capitalSocial}` : ""}
${e.decisorNome ? `- Sócio/decisor identificado: ${e.decisorNome}` : "- Sócio/decisor identificado: NENHUM"}
${e.cargoPrioritario ? `- Cargo-alvo: ${e.cargoPrioritario}` : ""}

ESCREVA UM PRIMEIRO E-MAIL DE PROSPECÇÃO pronto para copiar e colar:
${instrucaoSaudacao}
2. Primeiro parágrafo: UM gancho específico desta empresa — cite o nome dela e conecte com segmento/porte/maturidade (gatilho observável, sem inventar fatos).
3. Segundo parágrafo:${
      temPerfil || temIcp
        ? ` CITE CONCRETAMENTE a categoria da solução que quem envia vende (palavras simples, ex.: "monitoramento de ameaças cibernéticas") e amarre com UMA dor específica da operação real DESSA empresa. PROIBIDO clichês vagos ("eficiência operacional", "otimizar processos", "potencializar resultados") sem ligação direta com o produto; seja específico da operação (frigorífico -> rastreabilidade de lote e paradas de linha; transportadora -> custo por km; clínica -> proteção de dados de pacientes).`
        : ` foque em UMA dor específica da operação real desta empresa e convide para entender o cenário — sem citar produto específico.`
    }
4. Fechamento: convite leve de 15 minutos.
5. Sem markdown, sem placeholders entre colchetes, máximo 120 palavras, português comercial brasileiro simples e humano.
6. NÃO confunda o DOMÍNIO DO PRODUTO com o SEGMENTO da empresa-alvo: se quem envia vende cibersegurança e a alvo é um frigorífico, a dor é proteger os dados e sistemas DO frigorífico — nunca transforme o tema do segmento em oferta (ex.: jamais escreva "segurança alimentar" como se fosse o que vendemos).

RESPONDA APENAS COM ESTE JSON:
{"assunto":"assunto curto com até 60 caracteres","mensagem":"corpo completo do e-mail"}`;

    const { response } = await chamarIa(prompt, {
      maxTokens: 700,
      temperature: 0.7,
      timeoutMs: 60000,
    });

    const parsed = JSON.parse(response) as {
      assunto?: string;
      mensagem?: string;
    };

    return NextResponse.json({
      assunto: parsed.assunto ?? "",
      mensagem: parsed.mensagem ?? "",
    });
  } catch {
    return NextResponse.json(
      { erro: "Não conseguimos gerar o e-mail agora. Tente novamente." },
      { status: 500 }
    );
  }
}
