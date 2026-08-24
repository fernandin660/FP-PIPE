export type PlanoChave = "teste" | "silver" | "gold" | "platinum";
export type Ciclo = "mensal" | "anual";

export interface DefinicaoPlano {
  nome: string;
  precoMensal: number;
  precoAnualPorMes: number;
  empresasMes: number;
  listasMes: number;
  temBuscador: boolean;
  buscasMes: number | null;
}

export const DEFINICAO_PLANOS: Record<PlanoChave, DefinicaoPlano> = {
  teste: {
    nome: "Teste grátis",
    precoMensal: 0,
    precoAnualPorMes: 0,
    empresasMes: 50,
    listasMes: 2,
    temBuscador: true,
    buscasMes: 5,
  },
  silver: {
    nome: "Silver",
    precoMensal: 147,
    precoAnualPorMes: 117,
    empresasMes: 250,
    listasMes: 15,
    temBuscador: false,
    buscasMes: null,
  },
  gold: {
    nome: "Gold",
    precoMensal: 297,
    precoAnualPorMes: 227,
    empresasMes: 400,
    listasMes: 40,
    temBuscador: true,
    buscasMes: 400,
  },
  platinum: {
    nome: "Platinum",
    precoMensal: 497,
    precoAnualPorMes: 387,
    empresasMes: 1000,
    listasMes: 90,
    temBuscador: true,
    buscasMes: 1000,
  },
};

export function precoDoPlano(plano: PlanoChave, ciclo: Ciclo): number {
  const def = DEFINICAO_PLANOS[plano];
  if (!def) throw new Error("Plano desconhecido");
  return ciclo === "anual"
    ? def.precoAnualPorMes * 12
    : def.precoMensal;
}

export function duracaoDias(ciclo: Ciclo): number {
  return ciclo === "anual" ? 365 : 30;
}

// ------------------------------------------------------------
// Portao de acesso: le a assinatura do usuario e devolve o que
// ele pode usar. Assinatura ausente = teste. Expirada = bloqueia.
// ------------------------------------------------------------

type ClienteServidor = NonNullable<
  Awaited<ReturnType<typeof import("./supabase/server").criarClienteSupabaseServidor>>
>;

export interface AcessoUsuario {
  usuarioId: string;
  plano: PlanoChave;
  def: DefinicaoPlano;
  expirada: boolean;
}

export async function avaliarAcesso(
  supabase: ClienteServidor,
  usuarioId: string
): Promise<AcessoUsuario> {
  const { data } = await supabase
    .from("assinaturas")
    .select("plano, status, renova_em")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  const chavePlano = ((data?.plano as PlanoChave) || "teste") as PlanoChave;
  const def = DEFINICAO_PLANOS[chavePlano] ?? DEFINICAO_PLANOS.teste;

  const statusValido = !data || data.status === "ativa";
  const dentroDaValidade =
    !data?.renova_em ||
    new Date(data.renova_em).getTime() > Date.now() ||
    chavePlano === "teste";

  return {
    usuarioId,
    plano: chavePlano,
    def,
    expirada: !statusValido || !dentroDaValidade,
  };
}

export function mesAtual(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}
