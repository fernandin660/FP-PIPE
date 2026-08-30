import type { criarClienteSupabaseServidor } from "./supabase/server";

type ClienteServidor = NonNullable<
  Awaited<ReturnType<typeof criarClienteSupabaseServidor>>
>;

export type PayloadAlvos = {
  cnpjs?: string[];
  company_ids?: string[];
  contact_ids?: string[];
};

export type Estagio = {
  id: string;
  organizacao_id: string;
  nome: string;
  ordem_estagio: number;
  cor: string;
  criado_em: string;
};

export type MembroOrg = {
  usuario_id: string;
  nome: string | null;
  email: string | null;
};

/**
 * Garante que a organização tenha os estágios de pipeline padrão.
 * Idempotente: só semeia quando não há nenhum estágio ainda.
 */
export async function garantirEstagios(
  supabase: ClienteServidor,
  orgId: string
): Promise<void> {
  const { count } = await supabase
    .from("pipeline_stages")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", orgId);

  if ((count ?? 0) === 0) {
    await supabase.rpc("_crm_seed_estagios", { org_id: orgId });
  }
}

export async function listarEstagios(
  supabase: ClienteServidor,
  orgId: string
): Promise<Estagio[]> {
  await garantirEstagios(supabase, orgId);
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id, nome, cor, ordem_estagio, criado_em")
    .eq("organizacao_id", orgId)
    .order("ordem_estagio", { ascending: true });
  return (data as Estagio[]) ?? [];
}

export async function listarMembros(
  supabase: ClienteServidor,
  orgId: string
): Promise<MembroOrg[]> {
  const { data: membros } = await supabase
    .from("organizacao_membros")
    .select("usuario_id, email_convite")
    .eq("organizacao_id", orgId);

  const lista = (membros ?? []) as Array<{
    usuario_id: string;
    email_convite: string | null;
  }>;

  let perfis: Array<{ usuario_id: string; nome_usuario: string | null }> | null =
    null;
  if (lista.length > 0) {
    const { data } = await supabase
      .from("perfil")
      .select("usuario_id, nome_usuario")
      .in(
        "usuario_id",
        lista.map((m) => m.usuario_id)
      );
    perfis = (data ?? []) as Array<{ usuario_id: string; nome_usuario: string | null }>;
  }
  const mapaNome = new Map<string, string | null>();
  for (const p of perfis ?? []) mapaNome.set(p.usuario_id, p.nome_usuario);

  return lista.map((m) => ({
    usuario_id: m.usuario_id,
    nome: mapaNome.get(m.usuario_id) ?? null,
    email: m.email_convite,
  }));
}

function normalizarCnpj(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 14);
}

/**
 * Resolve as origens de entrada (cnpjs, company_ids, contact_ids) num
 * conjunto único de company_id válidos para a organização. Cada company_id
 * resolvido é validado/retornado já como linha de `companies` da org.
 * Retorna também a origem recomendada por company (cadastro/manual).
 */
export async function resolverAlvos(
  supabase: ClienteServidor,
  orgId: string,
  payload: PayloadAlvos
): Promise<Array<{ company_id: string; origem: string }>> {
  const cnpjs = (payload.cnpjs ?? [])
    .map((c) => normalizarCnpj(c))
    .filter((c) => c.length === 14);
  const companyIds = Array.from(
    new Set((payload.company_ids ?? []).filter((c) => typeof c === "string"))
  );
  const contactIds = Array.from(
    new Set((payload.contact_ids ?? []).filter((c) => typeof c === "string"))
  );

  if (cnpjs.length === 0 && companyIds.length === 0 && contactIds.length === 0) {
    return [];
  }

  const resultado = new Map<string, string>();

  // 1) Resolve contact_ids -> companies (agrupa contatos da mesma empresa).
  if (contactIds.length > 0) {
    const { data: contatos } = await supabase
      .from("contatos")
      .select("company_id")
      .in("id", contactIds);
    for (const c of (contatos ?? []) as Array<{ company_id: string | null }>) {
      if (c.company_id) resultado.set(c.company_id, "busca_contato");
    }
  }

  // 2) company_ids diretos (da org, validados por RLS no select).
  if (companyIds.length > 0) {
    const { data: empresas } = await supabase
      .from("companies")
      .select("id")
      .in("id", companyIds);
    for (const e of (empresas ?? []) as Array<{ id: string }>) {
      if (!resultado.has(e.id)) resultado.set(e.id, "manual");
    }
  }

  // 3) cnpjs -> companies da org (mesmo padrão de listas/salvar).
  if (cnpjs.length > 0) {
    const [{ data: empresasOrg }, { data: empresasUser }] = await Promise.all([
      supabase
        .from("companies")
        .select("id, cnpj")
        .eq("organizacao_id", orgId)
        .in("cnpj", cnpjs),
      supabase
        .from("companies")
        .select("id, cnpj")
        .eq("usuario_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .in("cnpj", cnpjs),
    ]);

    const mapaCnpj = new Map<string, string>();
    for (const e of [...(empresasOrg ?? []), ...(empresasUser ?? [])] as Array<{
      id: string;
      cnpj: string;
    }>) {
      // constraint legada é por usuário+cnpj; empresa da org tem prioridade.
      if (!mapaCnpj.has(e.cnpj)) mapaCnpj.set(e.cnpj, e.id);
    }
    for (const cnpj of cnpjs) {
      const id = mapaCnpj.get(cnpj);
      if (id && !resultado.has(id)) resultado.set(id, "busca_empresa");
    }
  }

  return Array.from(resultado.entries()).map(([company_id, origem]) => ({
    company_id,
    origem,
  }));
}

export function deduplicar<T extends { company_id: string }>(
  alvos: T[]
): T[] {
  const vistos = new Set<string>();
  const unicos: T[] = [];
  for (const alvo of alvos) {
    if (!vistos.has(alvo.company_id)) {
      vistos.add(alvo.company_id);
      unicos.push(alvo);
    }
  }
  return unicos;
}
