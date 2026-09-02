// ============================================================
// FP Pipe · Enrichment Engine — Contratos
// Camada única de enriquecimento (telefone, e-mail, dados,
// cargo, website, linkedin, sócios) com providers plugáveis.
// ============================================================

// Tipos de dado que o engine sabe buscar.
export type DadoTipo =
  | "telefone"
  | "email"
  | "dados_cadastrais"
  | "cargo"
  | "website"
  | "linkedin_empresa"
  | "socios";

// Classificação do telefone (importante: "direct" NÃO é celular/mobile).
export type TelefoneTipo = "mobile" | "direct" | "landline" | "company" | "unknown";

// Qualidade atribuída a um e-mail.
export type EmailTipo = "verificado" | "sugerido";

export type TelefoneEncontrado = {
  numero: string;
  tipo: TelefoneTipo;
  fonte: string;
  confianca: number; // 0-100
};

export type EmailEncontrado = {
  email: string;
  tipo: EmailTipo;
  confianca: number; // 0-100
};

// Alvo do enriquecimento: um contato ou uma empresa.
export type Alvo = {
  tipo: "contato" | "empresa";
  id?: string; // contato.id / companies.id
  chave?: string; // identificador de rastreio (linkedin_url, cnpj, dominio)
  linkedin?: string;
  nome?: string; // nome da pessoa (contato)
  nomeEmpresa?: string;
  dominio?: string;
  cnpj?: string;
  cidade?: string;
  uf?: string;
  website?: string;
};

// Contexto autenticado (para ledger/custo por org). Opcional: sem ele o
// engine só audita (org/usuario null) e não debita créditos.
export type ContextoEnriquecimento = {
  organizacao_id?: string | null;
  usuario_id?: string | null;
};

// Resultado padronizado de UM provider.
export type DadosProvider = {
  telefones?: TelefoneEncontrado[];
  emails?: EmailEncontrado[];
  cadastrais?: Record<string, unknown>;
  cargo?: string | null;
  website?: string | null;
  linkedinEmpresa?: string | null;
  socios?: string[];
  fonteNome?: string | null; // nome legível do lugar/entidade (ex.: displayName do Maps)
};

export interface ResultadoProvider {
  provider: string;
  requestId: string;
  ok: boolean; // requisição executou (não é sinônimo de "achou")
  encontrado: boolean; // retornou algo útil para o tipo pedido
  erro?: { codigo: string; mensagem: string };
  creditoConsumido: number; // 0 se não cobrou
  custoEstimado: number;
  moeda: "credito" | "brl" | "usd";
  cacheHit: boolean;
  fonte: string;
  confianca: number; // 0-100
  dados?: DadosProvider;
}

// Interface de provider. Para adicionar um NOVO provider, implementa esta
// interface e registra no registry. O Engine não precisa mudar.
export interface Provider {
  readonly nome: string; // identificação (ex.: 'serper', 'kaspr')
  readonly suporta: DadoTipo[]; // tipos que sabe buscar
  readonly timeoutMs?: number; // padrão de timeout
  readonly maxRetries?: number;

  // Busca um tipo de dado. NUNCA deve lançar para retornar "vazio" — em
  // timeout/erro devolve ResultadoProvider com ok=false.
  enrich(pedido: Pedido, alvo: Alvo): Promise<ResultadoProvider>;
}

// Pedido padronizado enviado ao provider.
export type Pedido = {
  orgId?: string | null;
  usuarioId?: string | null;
  tipo: DadoTipo;
  alvo: Alvo;
};

// Resultado normalizado devolvido pelo engine (agrega waterfall + cache).
export type ResultadoEngine = {
  ok: boolean;
  tipo: DadoTipo;
  alvo: Alvo;
  fonte: string | null; // provider/fonte que resolveu
  confianca: number;
  cacheHit: boolean;
  custoEstimado: number;
  creditoConsumido: number;
  moeda: "credito" | "brl" | "usd";
  dados?: {
    telefones?: TelefoneEncontrado[];
    emails?: EmailEncontrado[];
    cadastrais?: Record<string, unknown>;
    cargo?: string | null;
    website?: string | null;
    linkedinEmpresa?: string | null;
    socios?: string[];
  };
  parciais?: ResultadoProvider[]; // tentativas que não validaram (auditoria/UX)
};

export const MOEDA_LABEL: Record<"credito" | "brl" | "usd", string> = {
  credito: "crédito(s)",
  brl: "R$",
  usd: "US$",
};
