import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { deduplicar, ehMembroAtivo, listarFunis, listarEstagios, listarMembros, resolverAlvos, type PayloadAlvos } from "../../../../lib/crm";
import { UUID, erro, lerCorpo, texto } from "../../../../lib/crm-api";
import { nomeOrganizacao } from "../../../../lib/crm-cadastros";
import { COLUNAS_LEAD, ETIQUETAS_LEAD, STATUS_LEAD, type LinhaLead } from "../../../../lib/crm-leads";

const ORIGENS = new Set(["manual", "lista", "busca_empresa", "busca_contato", "importacao", "site"]);

/**
 * GET ?status=aberto|arquivado|convertido: leads da caixa de entrada com a
 * organização, a pessoa e o responsável já resolvidos; também devolve os
 * funis/etapas (para converter) e a equipe.
 */
export async function GET(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;
  const status = new URL(req.url).searchParams.get("status") ?? "aberto";
  if (!(STATUS_LEAD as readonly string[]).includes(status)) return erro("Status inválido.");

  const [{ data, error }, contagem, funis, etapas, membros] = await Promise.all([
    supabase
      .from("crm_leads")
      .select(COLUNAS_LEAD)
      .eq("organizacao_id", orgId)
      .eq("status", status)
      .order("criado_em", { ascending: false })
      .limit(1000),
    supabase.from("crm_leads").select("status").eq("organizacao_id", orgId),
    listarFunis(supabase, orgId),
    listarEstagios(supabase, orgId),
    listarMembros(supabase, orgId),
  ]);
  if (error) return erro("Não conseguimos carregar a caixa de entrada.", 500);
  const linhas = (data ?? []) as LinhaLead[];

  const idsEmpresas = [...new Set(linhas.map((l) => l.company_id).filter((x): x is string => Boolean(x)))];
  const idsPessoas = [...new Set(linhas.map((l) => l.pessoa_id).filter((x): x is string => Boolean(x)))];
  const [{ data: empresas }, { data: pessoas }] = await Promise.all([
    idsEmpresas.length
      ? supabase
          .from("companies")
          .select("id, razao_social, nome_fantasia, municipio, uf, telefone, segmento_icp")
          .eq("organizacao_id", orgId)
          .in("id", idsEmpresas)
      : Promise.resolve({ data: [] }),
    idsPessoas.length
      ? supabase.from("contatos").select("id, nome, cargo, email, telefone").eq("organizacao_id", orgId).in("id", idsPessoas)
      : Promise.resolve({ data: [] }),
  ]);
  const mapaEmpresa = new Map(
    ((empresas ?? []) as Array<{ id: string; razao_social: string | null; nome_fantasia: string | null; municipio: string | null; uf: string | null; telefone: string | null; segmento_icp: string | null }>).map((e) => [
      e.id,
      { id: e.id, nome: nomeOrganizacao(e), municipio: e.municipio, uf: e.uf, telefone: e.telefone, segmento: e.segmento_icp },
    ])
  );
  const mapaPessoa = new Map(
    ((pessoas ?? []) as Array<{ id: string; nome: string | null; cargo: string | null; email: string | null; telefone: string | null }>).map((p) => [p.id, p])
  );
  const mapaMembro = new Map(membros.map((m) => [m.usuario_id, m.nome || m.email || "Membro"]));

  const totais: Record<string, number> = { aberto: 0, arquivado: 0, convertido: 0 };
  for (const l of (contagem.data ?? []) as Array<{ status: string }>) totais[l.status] = (totais[l.status] ?? 0) + 1;

  return NextResponse.json({
    leads: linhas.map((l) => ({
      ...l,
      organizacao: l.company_id ? mapaEmpresa.get(l.company_id) ?? null : null,
      pessoa: l.pessoa_id ? mapaPessoa.get(l.pessoa_id) ?? null : null,
      responsavel_nome: l.responsavel_id ? mapaMembro.get(l.responsavel_id) ?? null : null,
      criado_por_nome: l.criado_por ? mapaMembro.get(l.criado_por) ?? null : null,
    })),
    totais,
    funis,
    etapas: etapas.map((e) => ({ id: e.id, nome: e.nome, pipeline_id: e.pipeline_id })),
    membros: membros.map((m) => ({ usuario_id: m.usuario_id, nome: m.nome, email: m.email })),
  });
}

/**
 * POST: cria um lead manual ({ titulo, company_id?, pessoa_id?, responsavel_id?,
 * valor?, etiqueta?, observacao? }) ou vários de uma vez a partir das listas
 * ({ payload: { company_ids | cnpjs | contact_ids }, responsavel_id?, origem? }).
 */
export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId, usuarioId } = ctx!;
  const corpo = await lerCorpo(req);
  if (!corpo) return erro("JSON inválido.");

  const responsavelId = typeof corpo.responsavel_id === "string" && UUID.test(corpo.responsavel_id) ? corpo.responsavel_id : usuarioId;
  if (responsavelId !== usuarioId && !(await ehMembroAtivo(supabase, orgId, responsavelId))) {
    return erro("Responsável não faz parte desta organização.");
  }

  // Em lote, a partir das listas e buscas.
  if (corpo.payload && typeof corpo.payload === "object") {
    const origem = typeof corpo.origem === "string" && ORIGENS.has(corpo.origem) ? corpo.origem : "lista";
    const alvos = deduplicar(await resolverAlvos(supabase, orgId, corpo.payload as PayloadAlvos));
    if (alvos.length === 0) return erro("Nenhuma empresa válida encontrada na sua organização.");

    const ids = alvos.map((a) => a.company_id);
    const [{ data: abertos }, { data: empresas }] = await Promise.all([
      supabase.from("crm_leads").select("company_id").eq("organizacao_id", orgId).eq("status", "aberto").in("company_id", ids),
      supabase.from("companies").select("id, razao_social, nome_fantasia").eq("organizacao_id", orgId).in("id", ids),
    ]);
    const jaNaCaixa = new Set((abertos ?? []).map((l) => l.company_id as string));
    const nomes = new Map(
      ((empresas ?? []) as Array<{ id: string; razao_social: string | null; nome_fantasia: string | null }>).map((e) => [e.id, nomeOrganizacao(e)])
    );
    const novos = ids
      .filter((id) => !jaNaCaixa.has(id) && nomes.has(id))
      .map((id) => ({
        organizacao_id: orgId,
        titulo: nomes.get(id)!.slice(0, 200),
        company_id: id,
        responsavel_id: responsavelId,
        origem,
        criado_por: usuarioId,
      }));
    if (novos.length > 0) {
      const { error } = await supabase.from("crm_leads").insert(novos);
      if (error) return erro("Não foi possível mandar para a caixa de entrada.", 500);
    }
    return NextResponse.json({ adicionadas: novos.length, jaExistem: [...jaNaCaixa] }, { status: 201 });
  }

  // Um lead manual.
  const titulo = texto(corpo.titulo, 200);
  if (!titulo) return erro("Dê um título ao lead.");
  const novo: Record<string, unknown> = {
    organizacao_id: orgId,
    titulo,
    responsavel_id: responsavelId,
    origem: "manual",
    criado_por: usuarioId,
    observacao: texto(corpo.observacao, 5000),
  };
  if (typeof corpo.company_id === "string" && corpo.company_id) {
    const { data } = await supabase.from("companies").select("id").eq("id", corpo.company_id).eq("organizacao_id", orgId).maybeSingle();
    if (!data) return erro("Organização não encontrada.");
    novo.company_id = data.id;
  }
  if (typeof corpo.pessoa_id === "string" && corpo.pessoa_id) {
    const { data } = await supabase.from("contatos").select("id").eq("id", corpo.pessoa_id).eq("organizacao_id", orgId).maybeSingle();
    if (!data) return erro("Pessoa não encontrada.");
    novo.pessoa_id = data.id;
  }
  if (typeof corpo.valor === "number" && Number.isFinite(corpo.valor) && corpo.valor >= 0) novo.valor = corpo.valor;
  if (typeof corpo.etiqueta === "string" && (ETIQUETAS_LEAD as readonly string[]).includes(corpo.etiqueta)) novo.etiqueta = corpo.etiqueta;

  const { data, error } = await supabase.from("crm_leads").insert(novo).select(COLUNAS_LEAD).single();
  if (error || !data) return erro("Não foi possível criar o lead.", 500);
  return NextResponse.json({ lead: data }, { status: 201 });
}
