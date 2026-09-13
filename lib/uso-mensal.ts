import { criarClienteSupabaseAdmin } from "./supabase/admin";

type Admin = NonNullable<ReturnType<typeof criarClienteSupabaseAdmin>>;

/**
 * Registra o consumo mensal de empresas de uma organização de forma
 * resiliente à estrutura do banco:
 *
 * 1. Tenta o upsert por (organizacao_id, mes), a constraint canônica
 *    criada pela migration supabase-uso-mensal-org.sql.
 * 2. Se a constraint ainda não existir no banco (erro 42P10), usa fallback
 *    com a PK legada (usuario_id, mes), aproveitando a linha antiga quando
 *    houver.
 *
 * Retorna null em caso de sucesso ou o erro, para a rota decidir a resposta.
 */
export async function registrarUsoMensalEmpresas(
  admin: Admin,
  orgId: string,
  usuarioId: string,
  mes: string,
  totalAcumulado: number
) {
  const agora = new Date().toISOString();

  const erroUpsertOrg = (
    await admin
      .from("uso_mensal")
      .upsert(
        {
          usuario_id: usuarioId,
          organizacao_id: orgId,
          mes,
          empresas_geradas: totalAcumulado,
          atualizado_em: agora,
        },
        { onConflict: "organizacao_id,mes" }
      )
  ).error;

  if (!erroUpsertOrg) return null;

  // Fallback: sem a constraint única de org+mês, grava pela PK legada.
  const { data: linhaLegada } = await admin
    .from("uso_mensal")
    .select("organizacao_id")
    .eq("usuario_id", usuarioId)
    .eq("mes", mes)
    .maybeSingle();

  if (linhaLegada) {
    return (
      await admin
        .from("uso_mensal")
        .update({
          empresas_geradas: totalAcumulado,
          organizacao_id: orgId,
          atualizado_em: agora,
        })
        .eq("usuario_id", usuarioId)
        .eq("mes", mes)
    ).error;
  }

  return (
    await admin.from("uso_mensal").upsert(
      {
        usuario_id: usuarioId,
        organizacao_id: orgId,
        mes,
        empresas_geradas: totalAcumulado,
        atualizado_em: agora,
      },
      { onConflict: "usuario_id,mes" }
    )
  ).error;
}