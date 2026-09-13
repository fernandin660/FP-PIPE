// ============================================================================
// Classificação hierárquica Segmento → Subsegmento → CNAE + Tipo de Empresa.
//
// Camada de dados/configuração do SaaS. Os códigos CNAE usam o formato oficial
// de subclasse CNAE 2.3 com 7 dígitos (ex: "6201501" = 6201-5/01). Todos os
// códigos foram validados contra a base oficial IBGE (CNAE 2.3) via
// scripts/validar-classificacao.mjs.
//
// Arquitetura preparada para futuramente: B2B/B2C e ICP Score. Nada disso é
// implementado aqui — apenas a informação base (segmento/subsegmento/CNAE/
// tipo de empresa) já fica disponível para esses cálculos.
// ============================================================================

export const tiposEmpresaDisponiveis = [
  "Indústria / Fabricante",
  "Distribuidora / Atacadista",
  "Prestadora de Serviços",
  "Comércio / Varejo",
  "Outro",
] as const;

export type TipoEmpresa = (typeof tiposEmpresaDisponiveis)[number];

export interface Subsegmento {
  /** Identificador estável (slug sem acento). Usado para envio à API. */
  id: string;
  nome: string;
  descricao: string;
  /** Subclasses CNAE 2.3 (7 dígitos) que pertencem a este subsegmento. */
  cnaes: string[];
}

export interface Segmento {
  /** Rótulo oficial (igual ao usado hoje nos filtros/listas). */
  id: string;
  nome: string;
  descricao: string;
  subsegmentos: Subsegmento[];
}

// ============================================================================
// Divisão CNAE (2 primeiros dígitos) → Seção CNAE (letra oficial do IBGE).
// Base usada por tipoEmpresaPorCnae e pelas validações de estrutura.
// ============================================================================
const DIVISAO_PARA_SECAO: Record<string, string> = {
  "01": "A", "02": "A", "03": "A",
  "05": "B", "06": "B", "07": "B", "08": "B", "09": "B",
  "10": "C", "11": "C", "12": "C", "13": "C", "14": "C", "15": "C", "16": "C",
  "17": "C", "18": "C", "19": "C", "20": "C", "21": "C", "22": "C", "23": "C",
  "24": "C", "25": "C", "26": "C", "27": "C", "28": "C", "29": "C", "30": "C",
  "31": "C", "32": "C", "33": "C",
  "35": "D",
  "36": "E", "37": "E", "38": "E", "39": "E",
  "41": "F", "42": "F", "43": "F",
  "45": "G", "46": "G", "47": "G",
  "49": "H", "50": "H", "51": "H", "52": "H", "53": "H",
  "55": "I", "56": "I",
  "58": "J", "59": "J", "60": "J", "61": "J", "62": "J", "63": "J",
  "64": "K", "65": "K", "66": "K",
  "68": "L",
  "69": "M", "70": "M", "71": "M", "72": "M", "73": "M", "74": "M", "75": "M",
  "77": "N", "78": "N", "79": "N", "80": "N", "81": "N", "82": "N",
  "84": "O",
  "85": "P",
  "86": "Q", "87": "Q", "88": "Q",
  "90": "R", "91": "R", "92": "R", "93": "R",
  "94": "S", "95": "S", "96": "S",
  "97": "T",
  "99": "U",
};

export function secaoDeCnae(cnae: string): string | null {
  const codigo = String(cnae ?? "").replace(/\D/g, "");
  if (codigo.length !== 7) return null;
  return DIVISAO_PARA_SECAO[codigo.slice(0, 2)] ?? null;
}

// ============================================================================
// "Tipo de empresa" derivado da estrutura oficial CNAE (seção/divisão), como
// característica da ATIVIDADE empresarial — não é sinônimo de B2B/B2C.
// ============================================================================
export function tipoEmpresaPorCnae(cnae: string): TipoEmpresa {
  const secao = secaoDeCnae(cnae);
  const divisao = String(cnae ?? "").replace(/\D/g, "").slice(0, 2);

  // Indústria: fabricação (C) e construção (F), mais extração (B).
  if (secao === "C" || secao === "F" || secao === "B") return "Indústria / Fabricante";

  // Distribuição: comércio atacadista (divisão 46).
  if (divisao === "46") return "Distribuidora / Atacadista";

  // Comércio / Varejo: divisões 45 (veículos) e 47 (varejo).
  if (divisao === "45" || divisao === "47") return "Comércio / Varejo";

  // Produção agropecuária/florestal/pesca (A): não é indústria, nem comércio
  // nem serviço clássico.
  if (secao === "A") return "Outro";

  // Demais seções: atividades de serviços.
  if (secao) return "Prestadora de Serviços";

  return "Outro";
}

/** Considera todos os tipos cuja atividade "produz" algo (indústria). */
export function tiposIndustriais(): TipoEmpresa[] {
  return ["Indústria / Fabricante"];
}

// ============================================================================
// HIERARQUIA
// ============================================================================
export const segmentosClassificacao: Segmento[] = [

  // ------------------------------------------------------------------ AGRO
  {
    id: "Agronegócio e Agricultura",
    nome: "Agronegócio e Agricultura",
    descricao: "Produção, criação, insumos, máquinas e processamento agropecuário.",
    subsegmentos: [
      {
        id: "agro-agricultura",
        nome: "Agricultura",
        descricao: "Cultivo de lavouras temporárias e permanentes.",
        cnaes: ["0111301", "0111302", "0111303", "0112101", "0115600"],
      },
      {
        id: "agro-pecuaria",
        nome: "Pecuária",
        descricao: "Criação de bovinos, suínos, aves e outros animais.",
        cnaes: ["0151201", "0151202", "0142300", "0155501", "0155504"],
      },
      {
        id: "agro-insumos",
        nome: "Insumos agrícolas",
        descricao: "Fertilizantes, agrotóxicos e sementes.",
        cnaes: ["2013401", "2013402", "2051700", "0141501"],
      },
      {
        id: "agro-maquinas",
        nome: "Máquinas e equipamentos agrícolas",
        descricao: "Fabricação de tratores e máquinas agrícolas.",
        cnaes: ["2831300", "2833000", "3314711"],
      },
      {
        id: "agro-agroindustria",
        nome: "Agroindústria",
        descricao: "Abate, processamento e beneficiamento de origem agropecuária.",
        cnaes: ["1011201", "1012101", "1013901", "1041400"],
      },
      {
        id: "agro-armazenagem",
        nome: "Armazenagem e beneficiamento",
        descricao: "Armazenamento e depósitos de produção agrícola.",
        cnaes: ["5211701", "5212500"],
      },
      {
        id: "agro-servicos-apoio",
        nome: "Serviços de apoio à agricultura",
        descricao: "Serviços de preparação de solo, colheita e apoio.",
        cnaes: ["0161001", "0161003", "0162899"],
      },
    ],
  },

  // ------------------------------------------------------ ALIMENTOS E BEBIDAS
  {
    id: "Alimentos e Bebidas",
    nome: "Alimentos e Bebidas",
    descricao: "Indústria de alimentos, bebidas e alimentação fora do lar.",
    subsegmentos: [
      {
        id: "alim-industria-alimentos",
        nome: "Indústria de alimentos",
        descricao: "Abate, conservas, laticínios, panificação e derivados.",
        cnaes: ["1011201", "1012101", "1013901", "1031700", "1041400", "1051100"],
      },
      {
        id: "alim-bebidas",
        nome: "Bebidas",
        descricao: "Cervejas, refrigerantes e águas envasadas.",
        cnaes: ["1112700", "1121600", "1122401"],
      },
      {
        id: "alim-food-service",
        nome: "Alimentação fora do lar",
        descricao: "Restaurantes, lanchonetes e fornecimento de refeições.",
        cnaes: ["5611201", "5612100", "5620101"],
      },
      {
        id: "alim-comercio",
        nome: "Comércio de alimentos",
        descricao: "Varejo e atacado de alimentos e bebidas.",
        cnaes: ["4712100", "4731800", "4634601", "4634602"],
      },
    ],
  },

  // ------------------------------------------------------------------- AUTO
  {
    id: "Automotivo",
    nome: "Automotivo",
    descricao: "Fabricação, peças, comércio e manutenção de veículos.",
    subsegmentos: [
      {
        id: "auto-fabricacao",
        nome: "Fabricação de veículos e peças",
        descricao: "Automóveis, caminhões e autopeças.",
        cnaes: ["2910701", "2920401", "2941700", "2949299"],
      },
      {
        id: "auto-comercio",
        nome: "Comércio de veículos",
        descricao: "Concessionárias e venda de veículos.",
        cnaes: ["4511101", "4512901"],
      },
      {
        id: "auto-pecas",
        nome: "Peças e acessórios",
        descricao: "Comércio de peças e acessórios automotivos.",
        cnaes: ["4530703"],
      },
      {
        id: "auto-manutencao",
        nome: "Manutenção e reparação",
        descricao: "Oficinas mecânicas e serviços automotivos.",
        cnaes: ["4520001", "4520003", "4543900"],
      },
    ],
  },

  // ------------------------------------------------------------- CONSTRUÇÃO
  {
    id: "Construção Civil",
    nome: "Construção Civil",
    descricao: "Edificações, infraestrutura e serviços especializados.",
    subsegmentos: [
      {
        id: "const-edificacoes",
        nome: "Edificações",
        descricao: "Construção de edifícios e incorporação.",
        cnaes: ["4120400", "4110700"],
      },
      {
        id: "const-infra",
        nome: "Infraestrutura",
        descricao: "Rodovias, obras de infraestrutura e terraplenagem.",
        cnaes: ["4211101", "4313400", "4399103"],
      },
      {
        id: "const-instalacoes",
        nome: "Instalações",
        descricao: "Instalações elétricas, hidráulicas e ar-condicionado.",
        cnaes: ["4321500", "4322301"],
      },
      {
        id: "const-acabamento",
        nome: "Acabamento e reformas",
        descricao: "Acabamento, pintura e reformas.",
        cnaes: ["4330404", "4399104"],
      },
      {
        id: "const-materiais",
        nome: "Materiais de construção",
        descricao: "Comércio de materiais de construção.",
        cnaes: ["4744099", "4679699"],
      },
    ],
  },

  // ------------------------------------------------------------- CONSULTORIA
  {
    id: "Consultoria",
    nome: "Consultoria",
    descricao: "Consultoria empresarial, financeira e tecnologia.",
    subsegmentos: [
      {
        id: "cons-gestao",
        nome: "Consultoria em gestão",
        descricao: "Consultoria empresarial e organização.",
        cnaes: ["7020400", "6920601"],
      },
      {
        id: "cons-financeira",
        nome: "Consultoria financeira",
        descricao: "Auditoria, contabilidade e consultoria financeira.",
        cnaes: ["6920601"],
      },
      {
        id: "cons-ti",
        nome: "Consultoria em tecnologia",
        descricao: "Consultoria em TI e sistemas.",
        cnaes: ["6204000"],
      },
      {
        id: "cons-recursos-humanos",
        nome: "Recursos humanos",
        descricao: "Seleção e recolocação profissional.",
        cnaes: ["7810800", "7830200"],
      },
    ],
  },

  // -------------------------------------------------------------- E-COMMERCE
  {
    id: "E-commerce",
    nome: "E-commerce",
    descricao: "Varejo e plataformas de comércio eletrônico.",
    subsegmentos: [
      {
        id: "ecom-varejo",
        nome: "Varejo on-line",
        descricao: "Varejo por internet e catálogo.",
        cnaes: ["4781400"],
      },
      {
        id: "ecom-marketplace",
        nome: "Marketplace e plataformas",
        descricao: "Plataformas de venda intermediadas.",
        cnaes: ["6311900"],
      },
      {
        id: "ecom-varejo-geral",
        nome: "Varejo geral",
        descricao: "Grandes superfícies e lojas de departamento.",
        cnaes: ["4712100", "4713004", "4713002"],
      },
    ],
  },

  // --------------------------------------------------------------- EDUCAÇÃO
  {
    id: "Educação",
    nome: "Educação",
    descricao: "Ensino, cursos e escolas.",
    subsegmentos: [
      {
        id: "edu-basica",
        nome: "Educação básica",
        descricao: "Creches, educação infantil, fundamental e médio.",
        cnaes: ["8512100", "8513900"],
      },
      {
        id: "edu-superior",
        nome: "Educação superior",
        descricao: "Faculdades e universidades.",
        cnaes: ["8532500", "8533300"],
      },
      {
        id: "edu-cursos",
        nome: "Cursos e treinamentos",
        descricao: "Cursos livres, idiomas e preparatórios.",
        cnaes: ["8599604", "8599602", "8599603"],
      },
      {
        id: "edu-corporativo",
        nome: "Educação corporativa",
        descricao: "Treinamento em desenvolvimento profissional e gerencial.",
        cnaes: ["8599605"],
      },
    ],
  },

  // ------------------------------------------------------- ENERGIA E UTILITIES
  {
    id: "Energia e Utilities",
    nome: "Energia e Utilities",
    descricao: "Geração, transmissão e distribuição de energia e água.",
    subsegmentos: [
      {
        id: "ener-geracao",
        nome: "Geração de energia",
        descricao: "Hidrelétrica, termelétrica, solar e eólica.",
        cnaes: ["3511501", "3514000"],
      },
      {
        id: "ener-distribuicao",
        nome: "Transmissão e distribuição",
        descricao: "Redes e distribuição de energia elétrica.",
        cnaes: ["3511501", "3520401"],
      },
      {
        id: "ener-utilities",
        nome: "Água e saneamento",
        descricao: "Captação, tratamento e distribuição de água.",
        cnaes: ["3600601", "3701100", "3702900"],
      },
      {
        id: "ener-servicos",
        nome: "Serviços em energia",
        descricao: "Instalação e manutenção de sistemas elétricos.",
        cnaes: ["4321500", "3514000"],
      },
    ],
  },

  // ------------------------------------------------------------ FARMACÊUTICA
  {
    id: "Farmacêutica",
    nome: "Farmacêutica",
    descricao: "Medicamentos, farmácias e saúde.",
    subsegmentos: [
      {
        id: "farm-industria",
        nome: "Indústria farmacêutica",
        descricao: "Produção de medicamentos e insumos farmacêuticos.",
        cnaes: ["2121101", "2110600"],
      },
      {
        id: "farm-varejo",
        nome: "Farmácias e drogarias",
        descricao: "Varejo de medicamentos.",
        cnaes: ["4771701", "4771703"],
      },
      {
        id: "farm-servicos",
        nome: "Serviços de saúde",
        descricao: "Laboratórios e análises clínicas.",
        cnaes: ["8640202", "8630504"],
      },
    ],
  },

  // ---------------------------------------------------- GOVERNO E SETOR PÚBLICO
  {
    id: "Governo e Setor Público",
    nome: "Governo e Setor Público",
    descricao: "Administração pública, defesa e segurança.",
    subsegmentos: [
      {
        id: "gov-administracao",
        nome: "Administração pública",
        descricao: "Executivo, legislativo e órgãos federativos.",
        cnaes: ["8411600", "8412400"],
      },
      {
        id: "gov-defesa",
        nome: "Defesa e segurança",
        descricao: "Exército, polícia e proteção.",
        cnaes: ["8422100", "8423000"],
      },
    ],
  },

  // ------------------------------------------------------ HOTELARIA E TURISMO
  {
    id: "Hotelaria e Turismo",
    nome: "Hotelaria e Turismo",
    descricao: "Hospedagem, viagens e turismo.",
    subsegmentos: [
      {
        id: "hot-hospedagem",
        nome: "Hospedagem",
        descricao: "Hotéis, pousadas e outros alojamentos.",
        cnaes: ["5510801", "5590601"],
      },
      {
        id: "hot-agencias",
        nome: "Agências de viagem",
        descricao: "Agências de viagem e turismo.",
        cnaes: ["7911200"],
      },
      {
        id: "hot-servicos-turisticos",
        nome: "Serviços de turismo",
        descricao: "Excursões e atividades de lazer.",
        cnaes: ["7912100", "9102301"],
      },
    ],
  },

  // ------------------------------------------------------------- IMOBILIÁRIO
  {
    id: "Imobiliário",
    nome: "Imobiliário",
    descricao: "Compra, venda, locação e administração de imóveis.",
    subsegmentos: [
      {
        id: "imob-corretagem",
        nome: "Compra e venda",
        descricao: "Intermediação e corretagem de imóveis.",
        cnaes: ["6821801", "6810201"],
      },
      {
        id: "imob-locacao",
        nome: "Locação e administração",
        descricao: "Locação e administração de imóveis próprios e de terceiros.",
        cnaes: ["6821802", "6822600"],
      },
    ],
  },

  // -------------------------------------------------------- INDÚSTRIA QUÍMICA
  {
    id: "Indústria Química",
    nome: "Indústria Química",
    descricao: "Produtos químicos, cosméticos e agroquímicos.",
    subsegmentos: [
      {
        id: "qum-geral",
        nome: "Produtos químicos",
        descricao: "Produtos químicos inorgânicos e orgânicos.",
        cnaes: ["2013401", "2013402", "2063100", "2029100"],
      },
      {
        id: "qum-agroquimicos",
        nome: "Agroquímicos",
        descricao: "Fertilizantes e defensivos agrícolas.",
        cnaes: ["2013401", "2051700"],
      },
      {
        id: "qum-higiene",
        nome: "Higiene e cosméticos",
        descricao: "Sabões, detergentes e cosméticos.",
        cnaes: ["2061400", "2063100"],
      },
      {
        id: "qum-plasticos",
        nome: "Plásticos e embalagens",
        descricao: "Produtos e embalagens plásticas.",
        cnaes: ["2229302", "2222600"],
      },
    ],
  },

  // ---------------------------------------------------------------- JURÍDICO
  {
    id: "Jurídico",
    nome: "Jurídico",
    descricao: "Advocacia e serviços jurídicos.",
    subsegmentos: [
      {
        id: "jur-advocacia",
        nome: "Advocacia",
        descricao: "Escritórios de advocacia.",
        cnaes: ["6911701"],
      },
      {
        id: "jur-servicos",
        nome: "Serviços jurídicos",
        descricao: "Cartórios e atividades jurídicas conexas.",
        cnaes: ["6911702", "6912500"],
      },
    ],
  },

  // ----------------------------------------------------- LOGÍSTICA E TRANSPORTE
  {
    id: "Logística e Transporte",
    nome: "Logística e Transporte",
    descricao: "Transporte, armazenamento e correios.",
    subsegmentos: [
      {
        id: "log-carga",
        nome: "Transporte de carga",
        descricao: "Cargas rodoviárias, aéreas e marítimas.",
        cnaes: ["4930202", "4930203", "4930204", "4911600"],
      },
      {
        id: "log-passageiros",
        nome: "Transporte de passageiros",
        descricao: "Rodoviário e fretamento.",
        cnaes: ["4929902", "4922101", "4922102"],
      },
      {
        id: "log-armazenagem",
        nome: "Armazenagem",
        descricao: "Depósitos, armazéns e operações logísticas.",
        cnaes: ["5211701", "5212500", "5211799"],
      },
      {
        id: "log-entregas",
        nome: "Entregas e correios",
        descricao: "Serviços de entrega expressa.",
        cnaes: ["5310501", "5310502", "5320201"],
      },
    ],
  },

  // -------------------------------------------------------------- MANUFATURA
  {
    id: "Manufatura",
    nome: "Manufatura",
    descricao: "Indústrias de transformação em geral.",
    subsegmentos: [
      {
        id: "man-metal",
        nome: "Metalurgia e estruturas",
        descricao: "Estruturas metálicas e produtos de metal.",
        cnaes: ["2512800", "2539001", "2542000"],
      },
      {
        id: "man-plasticos",
        nome: "Plásticos e borracha",
        descricao: "Produtos de plástico e artefatos de borracha.",
        cnaes: ["2229399", "2219600"],
      },
      {
        id: "man-impressao",
        nome: "Impressão e gráfica",
        descricao: "Impressão, reprodução e encadernação.",
        cnaes: ["1813001", "1821100"],
      },
      {
        id: "man-quimica",
        nome: "Química e farmoquímica",
        descricao: "Produtos químicos e farmoquímicos.",
        cnaes: ["2029100", "2110600"],
      },
      {
        id: "man-moveis",
        nome: "Móveis",
        descricao: "Fabricação de móveis.",
        cnaes: ["3101200", "3104700"],
      },
    ],
  },

  // --------------------------------------------------------- MÍDIA E MARKETING
  {
    id: "Mídia e Marketing",
    nome: "Mídia e Marketing",
    descricao: "Publicidade, comunicação e criação.",
    subsegmentos: [
      {
        id: "mid-publicidade",
        nome: "Publicidade",
        descricao: "Agências de publicidade e propaganda.",
        cnaes: ["7311400", "7319002"],
      },
      {
        id: "mid-criacao",
        nome: "Criação e design",
        descricao: "Design, produção cultural e criativa.",
        cnaes: ["7410202", "9001901"],
      },
      {
        id: "mid-comunicacao",
        nome: "Comunicação e mídia",
        descricao: "Editoras, rádio, TV e mídia digital.",
        cnaes: ["5811500", "5911101", "6120501"],
      },
    ],
  },

  // -------------------------------------------------------------- MINERAÇÃO
  {
    id: "Mineração",
    nome: "Mineração",
    descricao: "Extração mineral e apoio.",
    subsegmentos: [
      {
        id: "min-atividade",
        nome: "Extração",
        descricao: "Minério de ferro, metálicos e demais minerais.",
        cnaes: ["0710301", "0729404", "0899199"],
      },
      {
        id: "min-pedra",
        nome: "Pedras e agregados",
        descricao: "Britamento e extração de pedras.",
        cnaes: ["0810099", "0810009"],
      },
    ],
  },

  // ------------------------------------------------------ ONGS E TERCEIRO SETOR
  {
    id: "ONGs e Terceiro Setor",
    nome: "ONGs e Terceiro Setor",
    descricao: "Associações, entidades e filantropia.",
    subsegmentos: [
      {
        id: "ong-associacoes",
        nome: "Associações e entidades",
        descricao: "Associações empresariais, profissionais e sociais.",
        cnaes: ["9430800", "9491000", "9492800"],
      },
      {
        id: "ong-social",
        nome: "Assistência social",
        descricao: "Serviços de assistência social e apoio.",
        cnaes: ["8800600", "9491000"],
      },
      {
        id: "ong-fundacoes",
        nome: "Fundações e filantropia",
        descricao: "Fundações e organizações sem fins lucrativos.",
        cnaes: ["9491000"],
      },
    ],
  },

  // --------------------------------------------------------- PAPEL E CELULOSE
  {
    id: "Papel e Celulose",
    nome: "Papel e Celulose",
    descricao: "Celulose, papel e artefatos.",
    subsegmentos: [
      {
        id: "pap-celulose",
        nome: "Celulose",
        descricao: "Celulose e pastas de madeira.",
        cnaes: ["1710900"],
      },
      {
        id: "pap-fabricacao",
        nome: "Papel",
        descricao: "Fabricação de papel, papelão e embalagens.",
        cnaes: ["1721400", "1731100", "1732000"],
      },
      {
        id: "pap-artefatos",
        nome: "Artefatos de papel",
        descricao: "Produtos de papel para escritório e embalagem.",
        cnaes: ["1742701", "1742799"],
      },
    ],
  },

  // ---------------------------------------------------------- PETRÓLEO E GÁS
  {
    id: "Petróleo e Gás",
    nome: "Petróleo e Gás",
    descricao: "Extração, refino e distribuição de combustíveis.",
    subsegmentos: [
      {
        id: "pet-extracao",
        nome: "Extração",
        descricao: "Extração de petróleo e gás natural.",
        cnaes: ["0600001", "0910600"],
      },
      {
        id: "pet-refino",
        nome: "Refino e biocombustíveis",
        descricao: "Refino de petróleo e álcool.",
        cnaes: ["1921700", "1932200"],
      },
      {
        id: "pet-varejo",
        nome: "Distribuição de combustíveis",
        descricao: "Postos e revenda de combustíveis.",
        cnaes: ["4731800", "4732600"],
      },
    ],
  },

  // ------------------------------------------------------------ SAÚDE E HOSPITALAR
  {
    id: "Saúde e Hospitais",
    nome: "Saúde e Hospitais",
    descricao: "Hospitais, clínicas e serviços de saúde.",
    subsegmentos: [
      {
        id: "sau-hospitais",
        nome: "Hospitais",
        descricao: "Atendimento hospitalar.",
        cnaes: ["8610101"],
      },
      {
        id: "sau-clinicas",
        nome: "Clínicas e consultórios",
        descricao: "Atendimento médico e odontológico ambulatorial.",
        cnaes: ["8630502", "8630503", "8630504"],
      },
      {
        id: "sau-laboratorios",
        nome: "Laboratórios e diagnóstico",
        descricao: "Análises clínicas e diagnóstico por imagem.",
        cnaes: ["8640202", "8640201"],
      },
      {
        id: "sau-outros",
        nome: "Outros serviços de saúde",
        descricao: "Fisioterapia, cuidados e medicina do trabalho.",
        cnaes: ["8650004", "8630506", "8690999"],
      },
    ],
  },

  // ---------------------------------------------------------------- SEGUROS
  {
    id: "Seguros",
    nome: "Seguros",
    descricao: "Seguradoras, corretoras e planos de saúde.",
    subsegmentos: [
      {
        id: "seg-seguradoras",
        nome: "Seguradoras",
        descricao: "Seguros de vida, saúde e patrimônio.",
        cnaes: ["6511101", "6512000"],
      },
      {
        id: "seg-corretagem",
        nome: "Corretagem e auxiliares",
        descricao: "Corretoras e atividades auxiliares de seguros.",
        cnaes: ["6629100", "6622300"],
      },
    ],
  },

  // ----------------------------------------------------- SERVIÇOS FINANCEIROS
  {
    id: "Serviços Financeiros",
    nome: "Serviços Financeiros",
    descricao: "Bancos, crédito, câmbio e fintechs.",
    subsegmentos: [
      {
        id: "fin-bancos",
        nome: "Bancos e cooperativas",
        descricao: "Instituições bancárias e cooperativas de crédito.",
        cnaes: ["6422100", "6421200", "6423900"],
      },
      {
        id: "fin-credito",
        nome: "Crédito e fomento",
        descricao: "Concessão de crédito e factoring.",
        cnaes: ["6491300", "6434400"],
      },
      {
        id: "fin-bolsa",
        nome: "Mercado de capitais",
        descricao: "Gestão de ativos e intermediação.",
        cnaes: ["6611802", "6612601", "6470101"],
      },
    ],
  },

  // ---------------------------------------------------- TECNOLOGIA E SOFTWARE
  {
    id: "Tecnologia e Software",
    nome: "Tecnologia e Software",
    descricao: "Desenvolvimento de software, TI e dados.",
    subsegmentos: [
      {
        id: "tec-desenvolvimento",
        nome: "Desenvolvimento de software",
        descricao: "Programas sob encomenda e licenciamento.",
        cnaes: ["6201501", "6201502", "6202300", "6203100"],
      },
      {
        id: "tec-consultoria",
        nome: "Consultoria em TI",
        descricao: "Consultoria e consultoria em infraestrutura.",
        cnaes: ["6204000"],
      },
      {
        id: "tec-suporte",
        nome: "Suporte e manutenção",
        descricao: "Suporte técnico e manutenção de sistemas.",
        cnaes: ["6209100"],
      },
      {
        id: "tec-dados",
        nome: "Dados e processamento",
        descricao: "Processamento de dados e hospedagem.",
        cnaes: ["6311900", "6201502"],
      },
      {
        id: "tec-ia",
        nome: "Inteligência artificial e dados",
        descricao: "Distribuição de software e tecnologia.",
        cnaes: ["6202300", "6311900"],
      },
    ],
  },

  // -------------------------------------------------------- TELECOMUNICAÇÕES
  {
    id: "Telecomunicações",
    nome: "Telecomunicações",
    descricao: "Telefonia, internet e mídia por assinatura.",
    subsegmentos: [
      {
        id: "tel-fixo",
        nome: "Telefonia fixa e móvel",
        descricao: "Operadoras de telefonia.",
        cnaes: ["6120501", "6110801"],
      },
      {
        id: "tel-internet",
        nome: "Provedores de internet",
        descricao: "Provedores de acesso à internet.",
        cnaes: ["6110801", "6110803"],
      },
      {
        id: "tel-tv",
        nome: "TV por assinatura",
        descricao: "Operadoras de TV a cabo e satélite.",
        cnaes: ["6141800", "6110803"],
      },
    ],
  },

  // ----------------------------------------------------------- TÊXTIL E MODA
  {
    id: "Têxtil e Moda",
    nome: "Têxtil e Moda",
    descricao: "Fiação, confecção e calçados.",
    subsegmentos: [
      {
        id: "tex-fiacao",
        nome: "Fiação e tecelagem",
        descricao: "Preparação e fiação de fibras têxteis.",
        cnaes: ["1311100", "1322700"],
      },
      {
        id: "tex-confeccao",
        nome: "Confecção",
        descricao: "Confecção de roupas.",
        cnaes: ["1412601", "1412602"],
      },
      {
        id: "tex-calcados",
        nome: "Calçados",
        descricao: "Fabricação de calçados.",
        cnaes: ["1531901", "1539400"],
      },
    ],
  },

  // ------------------------------------------------------------------ VAREJO
  {
    id: "Varejo",
    nome: "Varejo",
    descricao: "Comércio varejista em geral.",
    subsegmentos: [
      {
        id: "var-alimentar",
        nome: "Varejo alimentar",
        descricao: "Supermercados, hipermercados e minimercados.",
        cnaes: ["4712100", "4711301", "4721103", "4721102"],
      },
      {
        id: "var-especializado",
        nome: "Varejo especializado",
        descricao: "Vestuário, eletrônicos, móveis e ferramentas.",
        cnaes: ["4751201", "4744001", "4754701", "4772500"],
      },
      {
        id: "var-nao-alimentar",
        nome: "Varejo não alimentar",
        descricao: "Diversos artigos de uso pessoal e doméstico.",
        cnaes: ["4772500", "4782201", "4763601"],
      },
      {
        id: "var-farmacias",
        nome: "Farmácias",
        descricao: "Perfumarias e artigos médicos.",
        cnaes: ["4771701", "4771703", "4772500"],
      },
    ],
  },
];

// ============================================================================
// Acesso rápido (índices)
// ============================================================================
const indiceSegmento = new Map<string, Segmento>();
const indiceSubsegmento = new Map<string, { segmento: Segmento; subsegmento: Subsegmento }>();

for (const segmento of segmentosClassificacao) {
  indiceSegmento.set(segmento.id, segmento);
  for (const sub of segmento.subsegmentos) {
    indiceSubsegmento.set(sub.id, { segmento, subsegmento: sub });
  }
}

export function listarSegmentos(): string[] {
  return segmentosClassificacao.map((s) => s.id);
}

export function obterSegmento(id: string): Segmento | undefined {
  return indiceSegmento.get(id);
}

export function listarSubsegmentos(segmentoId: string): Subsegmento[] {
  return indiceSegmento.get(segmentoId)?.subsegmentos ?? [];
}

export function obterSubsegmento(id: string) {
  return indiceSubsegmento.get(id);
}

export function validarCnae(codigo: string): boolean {
  return /^\d{7}$/.test(String(codigo ?? "").trim());
}

/**
 * Expande a seleção de segmentos/subsegmentos para a lista de CNAEs.
 *
 * - Nenhum subsegmento: retorna todos os CNAEs dos segmentos selecionados.
 * - Subsegmentos: retorna apenas os CNAEs dos subsegmentos escolhidos
 *   (o segmento "pai" é inferido automaticamente).
 * - Todos: sem segmentos/subsegmentos → retorna CNAEs vazios.
 */
export function expandirSelecaoParaCnaes(
  segmentos: string[],
  subsegmentos: string[] = []
): string[] {
  const segmentosLimpos = (segmentos ?? []).filter(Boolean);
  const subsegmentosLimpos = (subsegmentos ?? []).filter(Boolean);

  if (segmentosLimpos.length === 0 && subsegmentosLimpos.length === 0) {
    return [];
  }

  // Se algum subsegmento foi escolhido, restringe aos CNAEs desses subsegmentos.
  if (subsegmentosLimpos.length > 0) {
    const alvos = new Set<string>();
    for (const id of subsegmentosLimpos) {
      const item = indiceSubsegmento.get(id);
      if (!item) continue;
      for (const cnae of item.subsegmento.cnaes) {
        if (validarCnae(cnae)) alvos.add(cnae);
      }
    }
    return Array.from(alvos);
  }

  // Sem subsegmentos: todos os CNAEs dos segmentos selecionados.
  const alvos = new Set<string>();
  for (const id of segmentosLimpos) {
    const segmento = indiceSegmento.get(id);
    if (!segmento) continue;
    for (const sub of segmento.subsegmentos) {
      for (const cnae of sub.cnaes) {
        if (validarCnae(cnae)) alvos.add(cnae);
      }
    }
  }
  return Array.from(alvos);
}

/**
 * CNAEs de UM segmento respeitando a seleção de subsegmentos.
 *
 * - Nenhum subsegmento deste segmento escolhido: retorna todos os CNAEs dele.
 * - Subsegmentos escolhidos: retorna apenas os CNAEs desses subsegmentos (o
 *   subsegmento nunca pode pertencer a outro segmento — o id é único).
 */
export function cnaesDeSegmentoComSubselecao(
  segmentoId: string,
  subsegmentos: string[] = []
): string[] {
  const segmento = indiceSegmento.get(segmentoId);
  if (!segmento) return [];

  const escolhidos = (subsegmentos ?? []).filter((id) =>
    segmento.subsegmentos.some((s) => s.id === id)
  );

  if (escolhidos.length === 0) {
    return segmento.subsegmentos.flatMap((s) => s.cnaes).filter(validarCnae);
  }

  return segmento.subsegmentos
    .filter((s) => escolhidos.includes(s.id))
    .flatMap((s) => s.cnaes)
    .filter(validarCnae);
}

/** Filtra uma lista de CNAEs pelos tipos de empresa selecionados. */
export function filtrarCnaesPorTipos(
  cnaes: string[],
  tipos: string[] = []
): string[] {
  if (!tipos || tipos.length === 0) return cnaes;
  const conjuntoTipos = new Set(tipos);
  return cnaes.filter((c) => conjuntoTipos.has(tipoEmpresaPorCnae(c)));
}

/** Segmentos afetados por uma seleção de subsegmentos (para validação na API). */
export function segmentosDosSubsegmentos(subsegmentos: string[]): string[] {
  const vistos = new Set<string>();
  for (const id of subsegmentos ?? []) {
    const item = indiceSubsegmento.get(id);
    if (item) vistos.add(item.segmento.id);
  }
  return Array.from(vistos);
}