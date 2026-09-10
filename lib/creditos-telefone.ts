import { criarClienteSupabaseAdmin } from "./supabase/admin";
import type { DefinicaoPlano } from "./planos";

// Repõe o saldo mensal de créditos de telefone (Gold=50, Platinum=100).
// Semântica ABSOLUTA (igual creditos_ia): cada ciclo renova o saldo do
// plano, independentemente do que sobrou do mês anterior. A tabela
// creditos_telefone não tem coluna usuario_id — só organizacao_id.
export async function reporCreditosTelefone(
  organizacaoId: string,
  definicao: Pick<DefinicaoPlano, "creditosTelefone">
): Promise<void> {
  if (definicao.creditosTelefone <= 0) return;

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return;

  const agora = new Date().toISOString();

  const { data: atual } = await admin
    .from("creditos_telefone")
    .select("saldo")
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (atual) {
    await admin
      .from("creditos_telefone")
      .update({ saldo: definicao.creditosTelefone, atualizado_em: agora })
      .eq("organizacao_id", organizacaoId);
  } else {
    await admin
      .from("creditos_telefone")
      .insert({
        organizacao_id: organizacaoId,
        saldo: definicao.creditosTelefone,
      });
  }
}