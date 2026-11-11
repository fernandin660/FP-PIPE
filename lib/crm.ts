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
  pipeline_id: string;
  nome: string;
  ordem_estagio: number;
  cor: string;
  probabilidade: number | null;
  criado_em: string;
};

export type Funil = { id: string; nome: string; ordem: number };

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

/** Etapas da organização (de todos os funis, ou só de um). */
export async function listarEstagios(
  supabase: ClienteServidor,
  orgId: string,
  funilId?: string
): Promise<Estagio[]> {
  await garantirEstagios(supabase, orgId);
  let consulta = supabase
    .from("pipeline_stages")
    .select("id, organizacao_id, pipeline_id, nome, cor, ordem_estagio, probabilidade, criado_em")
    .eq("organizacao_id", orgId);
  if (funilId) consulta = consulta.eq("pipeline_id", funilId);
  const { data } = await consulta.order("ordem_estagio", { ascending: true });
  return (data as Estagio[]) ?? [];
}

/** Funis da organização, na ordem de exibição (o primeiro é o padrão). */
export async function listarFunis(supabase: ClienteServidor, orgId: string): Promise<Funil[]> {
  await garantirEstagios(supabase, orgId);
  const { data } = await supabase
    .from("pipelines")
    .select("id, nome, ordem")
    .eq("organizacao_id", orgId)
    .order("ordem", { ascending: true })
    .order("criado_em", { ascending: true });
  return (data as Funil[]) ?? [];
}

/** Funil pedido (se for da organização) ou o padrão. */
export async function resolverFunil(
  supabase: ClienteServidor,
  orgId: string,
  funilId?: string | null
): Promise<{ funis: Funil[]; funil: Funil | null }> {
  const funis = await listarFunis(supabase, orgId);
  const funil = funis.find((f) => f.id === funilId) ?? funis[0] ?? null;
  return { funis, funil };
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

  // A organização é a fonte de verdade: NUNCA resolvemos uma company para
  // fora da organizacao_id atual nem para uma empresa legada (org NULL).
  const resultado = new Map<string, string>();

  // 1) Resolve contact_ids -> companies, MAS só se a empresa pertencer à
  //    organização atual. Nunca resolve para empresa de outra org/NULL-org.
  if (contactIds.length > 0) {
    const { data: contatos } = await supabase
      .from("contatos")
      .select("company_id")
      .eq("organizacao_id", orgId)
      .in("id", contactIds);
    const companyIdsDeContatos = Array.from(
      new Set(
        (contatos ?? [])
          .map((c) => (c as { company_id: string | null }).company_id)
          .filter((id): id is string => Boolean(id))
      )
    );
    if (companyIdsDeContatos.length > 0) {
      const { data: empresas } = await supabase
        .from("companies")
        .select("id")
        .eq("organizacao_id", orgId)
        .in("id", companyIdsDeContatos);
      for (const e of (empresas ?? []) as Array<{ id: string }>) {
        resultado.set(e.id, "busca_contato");
      }
    }
  }

  // 2) company_ids diretos — SOMENTE dentro da organização atual.
  if (companyIds.length > 0) {
    const { data: empresas } = await supabase
      .from("companies")
      .select("id")
      .eq("organizacao_id", orgId)
      .in("id", companyIds);
    for (const e of (empresas ?? []) as Array<{ id: string }>) {
      if (!resultado.has(e.id)) resultado.set(e.id, "manual");
    }
  }

  // 3) cnpjs -> SOMENTE companies da organização atual. Nunca faz fallback
  //    por usuario_id (evita resolver empresa legada/NULL-org ou de outra org).
  if (cnpjs.length > 0) {
    const { data: empresasOrg } = await supabase
      .from("companies")
      .select("id, cnpj")
      .eq("organizacao_id", orgId)
      .in("cnpj", cnpjs);

    const mapaCnpj = new Map<string, string>();
    for (const e of (empresasOrg ?? []) as Array<{ id: string; cnpj: string }>) {
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

/** O usuário informado é membro ativo da organização? (valida responsável) */
export async function ehMembroAtivo(
  supabase: ClienteServidor,
  orgId: string,
  usuarioId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("organizacao_membros")
    .select("usuario_id")
    .eq("organizacao_id", orgId)
    .eq("usuario_id", usuarioId)
    .eq("status", "ativo")
    .maybeSingle();
  return Boolean(data);
}

/**
 * Cancela as atividades programadas (cadência) ainda pendentes de uma ou
 * mais empresas. Preserva os dados: só marca `cancelada`.
 */
export async function cancelarProgramadasPendentes(
  supabase: ClienteServidor,
  orgId: string,
  companyIds: string[]
): Promise<void> {
  if (companyIds.length === 0) return;
  const { data: programadas } = await supabase
    .from("pipeline_historico")
    .select("id, dados")
    .eq("organizacao_id", orgId)
    .eq("tipo_evento", "atividade_programada")
    .in("company_id", companyIds);

  for (const p of programadas ?? []) {
    const dados = (p.dados as Record<string, unknown>) ?? {};
    if (dados.cancelada === true || dados.concluida === true) continue;
    await supabase
      .from("pipeline_historico")
      .update({ dados: { ...dados, cancelada: true } })
      .eq("id", p.id)
      .eq("organizacao_id", orgId);
  }
}

/** Início e fim do dia de hoje no horário de Brasília (UTC-3), em ms. */
export function limitesDeHojeBrasilia(): { inicio: number; fim: number } {
  const DESLOC = 3 * 3600 * 1000;
  const DIA = 86400000;
  const inicio = Math.floor((Date.now() - DESLOC) / DIA) * DIA + DESLOC;
  return { inicio, fim: inicio + DIA - 1 };
}

/** Data ISO válida (ou vazio). Evita gravar datas que quebram a ordenação. */
export function dataIsoValida(valor: string): string {
  if (!valor) return "";
  const t = new Date(valor).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : "";
}
