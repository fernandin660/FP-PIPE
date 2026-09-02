// ============================================================
// Credits — camada única de consumo/reserva/estorno de créditos.
// Reutiliza as tabelas existentes (creditos, creditos_contatos,
// creditos_telefone, creditos_ia) com o MESMO padrão atômico já
// usado no projeto (update ... gte saldo). NÃO cria um segundo
// sistema de créditos.
//
// Sem contexto de org, NÃO debita (apenas audita). Isso mantém
// compatibilidade com chamadas que ainda não foram migradas.
// ============================================================

import { criarClienteSupabaseAdmin } from "../supabase/admin";
import type { Custo } from "./cost";

type TabelaCredito = Custo["tabela_creditos"];

const TABELAS: Record<TabelaCredito, string> = {
  creditos: "creditos",
  creditos_contatos: "creditos_contatos",
  creditos_telefone: "creditos_telefone",
  creditos_ia: "creditos_ia",
};

// Reserva créditos de forma atômica (update ... gte saldo). Retorna a
// quantidade reservada (0 se sem saldo / sem custo / sem contexto).
export async function reservar(
  orgId: string | null | undefined,
  custo: Custo
): Promise<number> {
  if (!orgId || (custo.creditos ?? 0) === 0) return 0;

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return 0;

  const tabela = TABELAS[custo.tabela_creditos];

  const { data: atual } = await admin
    .from(tabela)
    .select("saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();

  const saldo = atual?.saldo ?? 0;
  if (saldo < custo.creditos) return 0;

  // Débito atômico e condicional: só baixa se o saldo ainda for >= créditos.
  const { data: novo } = await admin
    .from(tabela)
    .update({
      saldo: saldo - custo.creditos,
      atualizado_em: new Date().toISOString(),
    })
    .eq("organizacao_id", orgId)
    .gte("saldo", custo.creditos)
    .select("saldo")
    .maybeSingle();

  return novo ? custo.creditos : 0;
}

export async function estornar(
  orgId: string | null | undefined,
  custo: Custo,
  creditos: number
): Promise<void> {
  if (!orgId || creditos <= 0) return;
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return;
  const tabela = TABELAS[custo.tabela_creditos];
  const { data: atual } = await admin
    .from(tabela)
    .select("saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (!atual) return;
  await admin
    .from(tabela)
    .update({
      saldo: (atual.saldo ?? 0) + creditos,
      atualizado_em: new Date().toISOString(),
    })
    .eq("organizacao_id", orgId);
}
