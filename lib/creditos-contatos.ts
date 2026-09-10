import { criarClienteSupabaseAdmin } from "./supabase/admin";

type Admin = NonNullable<ReturnType<typeof criarClienteSupabaseAdmin>>;

const ESPERA_MS = 150;

type LinhaCredito = {
  linha: { usuario_id: string | null; organizacao_id: string | null; saldo: number };
  porOrg: boolean;
};

// A linha canônica de creditos_contatos é a da organização; a do usuário é
// a linha legada (pré-equipes). Preferimos a org, senão o usuário.
async function lerLinha(
  admin: Admin,
  orgId: string,
  usuarioId: string
): Promise<LinhaCredito | null> {
  const { data: org } = await admin
    .from("creditos_contatos")
    .select("usuario_id, organizacao_id, saldo")
    .eq("organizacao_id", orgId)
    .maybeSingle();
  if (org) return { linha: org, porOrg: true };

  const { data: user } = await admin
    .from("creditos_contatos")
    .select("usuario_id, organizacao_id, saldo")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (user) return { linha: user, porOrg: false };

  return null;
}

// Débito atômico sem depender de RPC de banco: UPDATE condicional no saldo
// que acabou de ser lido (WHERE saldo = saldoLido). Se outra requisição
// consumir o saldo entre leitura e escrita, o UPDATE não afeta nenhuma linha
// e a leitura é repetida. Robusto inclusive se as funções de banco estiverem
// ausentes/quebradas. Retorna o novo saldo ou null quando zerou.
export async function debitarCreditosContatos(
  admin: Admin,
  orgId: string,
  usuarioId: string,
  qtd: number
): Promise<number | null> {
  if (qtd <= 0) return null;

  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    const atual = await lerLinha(admin, orgId, usuarioId);
    if (!atual) return null;

    const saldo = atual.linha.saldo ?? 0;
    if (saldo < qtd) return null;

    const chave = atual.porOrg ? "organizacao_id" : "usuario_id";
    const valor = atual.porOrg ? orgId : atual.linha.usuario_id ?? "";

    const { data } = await admin
      .from("creditos_contatos")
      .update({ saldo: saldo - qtd })
      .eq(chave, valor)
      .eq("saldo", saldo)
      .select("saldo")
      .maybeSingle();

    if (data) return data.saldo;

    await new Promise((r) => setTimeout(r, ESPERA_MS));
  }
  return null;
}

// Estorno simples: devolve créditos à mesma linha (org ou usuário legado).
export async function creditarCreditosContatos(
  admin: Admin,
  orgId: string,
  usuarioId: string,
  qtd: number
): Promise<number | null> {
  if (qtd <= 0) return null;

  const atual = await lerLinha(admin, orgId, usuarioId);
  if (!atual) return null;

  const saldo = atual.linha.saldo ?? 0;
  const chave = atual.porOrg ? "organizacao_id" : "usuario_id";
  const valor = atual.porOrg ? orgId : atual.linha.usuario_id ?? "";

  const { data } = await admin
    .from("creditos_contatos")
    .update({ saldo: saldo + qtd })
    .eq(chave, valor)
    .select("saldo")
    .maybeSingle();

  return data ? data.saldo : null;
}