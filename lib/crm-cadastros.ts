import type { criarClienteSupabaseServidor } from "./supabase/server";
import { UUID, texto } from "./crm-api";
import { validarCampos } from "./crm-campos";

type ClienteServidor = NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServidor>>>;

/** Utilidades compartilhadas por Organizações e Pessoas. */

export function nomeOrganizacao(c: { nome_fantasia?: string | null; razao_social?: string | null }): string {
  return c.nome_fantasia?.trim() || c.razao_social?.trim() || "Sem nome";
}

export function primeiroEmail(p: { email?: string | null; emails?: string[] | null }): string | null {
  return p.email?.trim() || p.emails?.find((e) => e?.trim()) || null;
}

export function primeiroTelefone(p: { telefone?: string | null; telefones?: string[] | null }): string | null {
  return p.telefone?.trim() || p.telefones?.find((t) => t?.trim()) || null;
}

/** Escapa curingas do ilike do PostgREST (vírgulas e parênteses quebram o filtro or()). */
export function termoBusca(v: string | null): string | null {
  const t = (v ?? "").replace(/[%_,()*\\]/g, " ").trim().slice(0, 80);
  return t || null;
}

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida os dados comuns de criação/edição de pessoa. */
export async function dadosPessoa(
  supabase: ClienteServidor,
  orgId: string,
  corpo: Record<string, unknown>,
  parcial: boolean
): Promise<{ ok: true; dados: Record<string, unknown> } | { ok: false; erro: string }> {
  const dados: Record<string, unknown> = {};
  if (!parcial || corpo.nome !== undefined) {
    const nome = texto(corpo.nome, 120);
    if (!nome) return { ok: false, erro: "Informe o nome da pessoa." };
    dados.nome = nome;
  }
  if (corpo.cargo !== undefined) dados.cargo = texto(corpo.cargo, 120);
  if (corpo.telefone !== undefined) dados.telefone = texto(corpo.telefone, 40);
  if (corpo.observacoes !== undefined) dados.observacoes = texto(corpo.observacoes, 5000);
  if (corpo.email !== undefined) {
    const email = texto(corpo.email, 254)?.toLowerCase() ?? null;
    if (email && !EMAIL_VALIDO.test(email)) return { ok: false, erro: "E-mail inválido." };
    dados.email = email;
  }
  if (corpo.linkedin_url !== undefined) {
    const li = texto(corpo.linkedin_url, 300);
    if (li && !/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(li)) return { ok: false, erro: "Link do LinkedIn inválido." };
    dados.linkedin_url = li;
  }
  if (corpo.organizacao_id !== undefined) {
    if (corpo.organizacao_id === null || corpo.organizacao_id === "") {
      dados.company_id = null;
      dados.empresa = null;
    } else {
      const id = String(corpo.organizacao_id);
      if (!UUID.test(id)) return { ok: false, erro: "Organização inválida." };
      const { data: empresa } = await supabase
        .from("companies")
        .select("id, razao_social, nome_fantasia")
        .eq("id", id)
        .eq("organizacao_id", orgId)
        .maybeSingle();
      if (!empresa) return { ok: false, erro: "Organização não encontrada." };
      dados.company_id = empresa.id;
      dados.empresa = nomeOrganizacao(empresa);
    }
  }
  if (corpo.campos !== undefined) {
    const v = await validarCampos(supabase, orgId, "pessoa", corpo.campos);
    if (!v.ok) return { ok: false, erro: v.erro };
    dados.campos = v.valores;
  }
  return { ok: true, dados };
}

