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

// Reserva créditos de forma atômica. Prioriza o RPC de banco
// (debitar_saldo_org) que faz saldo = saldo - N ... where saldo >= N
// dentro de um único UPDATE, eliminando a corrida de leitura-escrita
// (TOCTOU). Se o RPC ainda não existir no banco (migration pendente),
// cai para o update atômico-condicional legado.
export async function reservar(
  orgId: string | null | undefined,
  custo: Custo
): Promise<number> {
  if (!orgId || (custo.creditos ?? 0) === 0) return 0;

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return 0;

  const tabela = TABELAS[custo.tabela_creditos];

  const { data: novoViaRpc, error: erroRpc } = await admin.rpc(
    "debitar_saldo_org",
    { p_tabela: tabela, p_org: orgId, p_qtd: custo.creditos }
  );

  // RPC disponível: retorna o novo saldo (null = sem saldo suficiente).
  if (!erroRpc) {
    return novoViaRpc != null ? custo.creditos : 0;
  }

  // Fallback legado (migration ainda não aplicada).
  const { data: atual } = await admin
    .from(tabela)
    .select("saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();

  const saldo = atual?.saldo ?? 0;
  if (saldo < custo.creditos) return 0;

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

  const { error: erroRpc } = await admin.rpc("creditar_saldo_org", {
    p_tabela: tabela,
    p_org: orgId,
    p_qtd: creditos,
  });
  if (!erroRpc) return;

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
