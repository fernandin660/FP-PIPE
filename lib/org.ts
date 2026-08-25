import { criarClienteSupabaseAdmin } from "./supabase/admin";

type ClienteServidor = NonNullable<
  Awaited<ReturnType<typeof import("./supabase/server").criarClienteSupabaseServidor>>
>;

export type PapelOrg = "admin" | "membro";

export type ContextoOrg = {
  orgId: string;
  papel: PapelOrg;
};

/**
 * Resolve a organização do usuário logado. Se não existe (usuário
 * criado antes do trigger de multi-empresa), cria automaticamente
 * como safety net server-side.
 *
 * IMPORTANTE: toda rota que usa exigirAcesso() deve chamar isto
 * DEPOIS de validar o login, passando o supabase autenticado.
 */
export async function resolverOrg(
  supabase: ClienteServidor,
  usuarioId: string
): Promise<ContextoOrg> {
  // Busca membership existente
  const { data: membro } = await supabase
    .from("organizacao_membros")
    .select("organizacao_id, papel")
    .eq("usuario_id", usuarioId)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (membro) {
    return { orgId: membro.organizacao_id, papel: membro.papel as PapelOrg };
  }

  // Safety net: usuário criado antes do trigger multi-empresa.
  // Usa admin client pra criar org + membros + migrar dados.
  return provisionarOrg(supabase, usuarioId);
}

/**
 * Cria organização para um usuário que não tem e migra seus dados.
 * Chamada apenas como safety net — o trigger faz isso atomicamente
 * para novos cadastros.
 */
async function provisionarOrg(
  supabase: ClienteServidor,
  usuarioId: string
): Promise<ContextoOrg> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    throw new Error("Admin client não disponível para provisionamento.");
  }

  // 1. Cria a organização
  const { data: org, error: erroOrg } = await admin
    .from("organizacoes")
    .insert({ nome: "Minha Empresa", dono_id: usuarioId })
    .select("id")
    .single();

  if (erroOrg || !org) {
    throw new Error(`Falha ao criar organização: ${erroOrg?.message}`);
  }

  const orgId = org.id;

  // 2. Busca o e-mail do usuário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Insere membro como admin
  await admin.from("organizacao_membros").insert({
    organizacao_id: orgId,
    usuario_id: usuarioId,
    email_convite: user?.email ?? null,
    papel: "admin",
    status: "ativo",
  });

  // 4. Migra dados existentes para a nova org
  const tabelas = [
    "creditos",
    "creditos_contatos",
    "creditos_ia",
    "assinaturas",
    "listas",
    "companies",
    "icps",
  ];

  for (const tabela of tabelas) {
    await admin
      .from(tabela)
      .update({ organizacao_id: orgId })
      .eq("usuario_id", usuarioId)
      .is("organizacao_id", null);
  }

  return { orgId, papel: "admin" };
}

/**
 * Conta quantos membros ativos a organização tem.
 */
export async function contarMembros(
  supabase: ClienteServidor,
  orgId: string
): Promise<number> {
  const { count } = await supabase
    .from("organizacao_membros")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", orgId)
    .eq("status", "ativo");

  return count ?? 0;
}

/**
 * Verifica se o usuário é admin da organização.
 */
export function isAdmin(papel: PapelOrg): boolean {
  return papel === "admin";
}
