import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mapa completo divisão CNAE 2.0 → segmentos do sistema.
 *
 * Cada segmento aponta para as divisões (2 dígitos) da classificação CNAE 2.0
 * que abrangem suas atividades. Quando o usuário escolhe um segmento SEM
 * subsegmentos, a busca usa TODOS os CNAEs dessas divisões (tabela
 * `cnae_completa`), em vez de apenas os códigos curados manualmente.
 *
 * Fonte das divisões: classificação CNAE 2.0 do IBGE (seções/divisões).
 */
export const DIVISOES_POR_SEGMENTO: Record<string, string[]> = {
  // A: Agricultura, pecuária, florestal, pesca
  "Agronegócio e Agricultura": ["01", "02", "03"],

  // C10/C11 fabricação + I56 alimentação
  "Alimentos e Bebidas": ["10", "11", "56"],

  // C29 fabricação de veículos + G45 comércio e reparação de veículos
  Automotivo: ["29", "45"],

  // F: construção de edifícios, infraestrutura, serviços especializados
  "Construção Civil": ["41", "42", "43"],

  // M70 consultoria em gestão, N78 locação de mão de obra, N82 apoio
  Consultoria: ["70", "78", "82"],

  // G46/G47 comércio (atacado/varejo), J63 serviços de informação on-line
  "E-commerce": ["46", "47", "63"],

  // P: educação
  Educação: ["85"],

  // D35 eletricidade/gás, E36-39 água/esgoto/resíduos
  "Energia e Utilities": ["35", "36", "37", "38", "39"],

  // C21 farmoquímicos + G47 farmácias + Q86 serviços de saúde
  Farmacêutica: ["21", "47", "86"],

  // O: administração pública, defesa, seguridade social
  "Governo e Setor Público": ["84"],

  // I55 alojamento, N79 agências de viagem, R91 patrimônio cultural
  "Hotelaria e Turismo": ["55", "79", "91"],

  // L: atividades imobiliárias
  Imobiliário: ["68"],

  // C20 produtos químicos + C22 borracha e plástico
  "Indústria Química": ["20", "22"],

  // M69 atividades jurídicas, de contabilidade e de auditoria
  Jurídico: ["69"],

  // H: transporte, armazenamento, correio/entregas
  "Logística e Transporte": ["49", "50", "51", "52", "53"],

  // C: demais fabricações (madeira, metalurgia, produtos de metal, eletrônicos,
  // máquinas, móveis, diversos) — impressão (18) vai em Mídia e Marketing.
  Manufatura: [
    "16", "24", "25", "26", "27", "28", "30", "31", "32", "33",
  ],

  // J58 edição, J59/J60 mídia, M73 publicidade, R90 artes e espetáculos
  "Mídia e Marketing": ["58", "59", "60", "73", "90"],

  // B: extração mineral (carvão, minérios, apoio)
  Mineração: ["05", "07", "08", "09"],

  // Q88 assistência social, S94 organizações associativas
  "ONGs e Terceiro Setor": ["88", "94"],

  // C17 celulose e papel
  "Papel e Celulose": ["17"],

  // B06 extração de petróleo, C19 coque/derivados, B09 apoio
  "Petróleo e Gás": ["06", "09", "19"],

  // Q: atenção à saúde humana e assistência
  "Saúde e Hospitais": ["86", "87", "88"],

  // K: seguros e previdência
  Seguros: ["65", "66"],

  // K: serviços financeiros e auxiliares (+ M69 contabilidade)
  "Serviços Financeiros": ["64", "66", "69"],

  // J62/J63 TI e informação, C26 equipamentos de informática
  "Tecnologia e Software": ["62", "63", "26"],

  // J61 telecomunicações
  Telecomunicações: ["61"],

  // C13 têxtil, C14 vestuário, C15 couro/calçados
  "Têxtil e Moda": ["13", "14", "15"],

  // G: comércio e reparação de veículos, atacado e varejo
  Varejo: ["45", "46", "47"],
};

const cacheCnaesPorSegmento = new Map<string, string[]>();

/**
 * Retorna TODOS os CNAEs de subclasse cadastrados na tabela `cnae_completa`
 * para as divisões do segmento. Usado quando o usuário marca o segmento sem
 * escolher subsegmentos: busca os CNAEs completos da hierarquia em vez dos
 * códigos curados manualmente.
 *
 * Cache em memória do processo para não re-consultar o banco a cada busca.
 */
export async function cnaesCompletosDoSegmento(
  admin: SupabaseClient,
  segmentoId: string
): Promise<string[]> {
  if (cacheCnaesPorSegmento.has(segmentoId)) {
    return cacheCnaesPorSegmento.get(segmentoId)!;
  }

  const divisoes = DIVISOES_POR_SEGMENTO[segmentoId];
  if (!divisoes || divisoes.length === 0) return [];

  const { data } = await admin
    .from("cnae_completa")
    .select("codigo")
    .in("divisao", divisoes);

  const codigos = (data ?? [])
    .map((r) => r.codigo)
    .filter((c): c is string => Boolean(c));
  // Respeita a ordem das divisões do mapa (mais relevantes primeiro).
  const ordenados = divisoes
    .map((d) => codigos.filter((c) => c.startsWith(d)))
    .flat();
  cacheCnaesPorSegmento.set(segmentoId, ordenados);
  return ordenados;
}