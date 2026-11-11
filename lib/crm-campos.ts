import type { criarClienteSupabaseServidor } from "./supabase/server";

type ClienteServidor = NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServidor>>>;

export type EntidadeCampo = "negocio" | "organizacao" | "pessoa";
export type TipoCampo =
  | "texto"
  | "texto_longo"
  | "numero"
  | "moeda"
  | "data"
  | "opcao"
  | "telefone"
  | "email"
  | "url";

export type CampoPersonalizado = {
  id: string;
  entidade: EntidadeCampo;
  nome: string;
  tipo: TipoCampo;
  opcoes: string[];
  ordem: number;
};

export const TIPOS_CAMPO: { valor: TipoCampo; rotulo: string }[] = [
  { valor: "texto", rotulo: "Texto curto" },
  { valor: "texto_longo", rotulo: "Texto longo" },
  { valor: "numero", rotulo: "Número" },
  { valor: "moeda", rotulo: "Valor em R$" },
  { valor: "data", rotulo: "Data" },
  { valor: "opcao", rotulo: "Lista de opções" },
  { valor: "telefone", rotulo: "Telefone" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "url", rotulo: "Link" },
];

export const ENTIDADES_CAMPO: { valor: EntidadeCampo; rotulo: string }[] = [
  { valor: "negocio", rotulo: "Negócios" },
  { valor: "organizacao", rotulo: "Organizações" },
  { valor: "pessoa", rotulo: "Pessoas" },
];

/** Normaliza um valor conforme o tipo do campo. `undefined` = valor inválido. */
export function normalizarValorCampo(campo: CampoPersonalizado, valor: unknown): unknown {
  if (valor === null || valor === "") return null;
  switch (campo.tipo) {
    case "texto":
    case "telefone":
      return typeof valor === "string" ? valor.trim().slice(0, campo.tipo === "texto" ? 500 : 40) : undefined;
    case "texto_longo":
      return typeof valor === "string" ? valor.trim().slice(0, 5000) : undefined;
    case "numero":
    case "moeda": {
      const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
      return Number.isFinite(n) ? n : undefined;
    }
    case "data":
      return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : undefined;
    case "opcao":
      return typeof valor === "string" && campo.opcoes.includes(valor) ? valor : undefined;
    case "email":
      return typeof valor === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())
        ? valor.trim().toLowerCase().slice(0, 254)
        : undefined;
    case "url":
      return typeof valor === "string" && /^https?:\/\/\S+$/i.test(valor.trim()) ? valor.trim().slice(0, 500) : undefined;
    default:
      return undefined;
  }
}

/**
 * Valida o objeto de campos personalizados enviado pelo app: só aceita
 * campos que existem na organização para essa entidade, no formato certo.
 * Valores vazios são removidos.
 */
export async function validarCampos(
  supabase: ClienteServidor,
  orgId: string,
  entidade: EntidadeCampo,
  entrada: unknown
): Promise<{ ok: true; valores: Record<string, unknown> } | { ok: false; erro: string }> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return { ok: false, erro: "Campos personalizados inválidos." };
  }
  const { data } = await supabase
    .from("crm_campos")
    .select("id, entidade, nome, tipo, opcoes, ordem")
    .eq("organizacao_id", orgId)
    .eq("entidade", entidade);
  const defs = new Map(((data ?? []) as CampoPersonalizado[]).map((c) => [c.id, c]));

  const valores: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(entrada as Record<string, unknown>)) {
    const campo = defs.get(chave);
    if (!campo) continue; // campo apagado ou de outra organização: ignora
    const normal = normalizarValorCampo(campo, valor);
    if (normal === undefined) {
      return { ok: false, erro: `Valor inválido em "${campo.nome}".` };
    }
    if (normal !== null) valores[chave] = normal;
  }
  return { ok: true, valores };
}
