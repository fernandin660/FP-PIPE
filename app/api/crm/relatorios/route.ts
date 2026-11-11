import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { listarFunis, listarMembros } from "../../../../lib/crm";
import { erro } from "../../../../lib/crm-api";
import { nomeOrganizacao } from "../../../../lib/crm-cadastros";
import { calcularRelatorios, type EtapaRel, type EventoRel, type MetaRel, type NegocioRel } from "../../../../lib/crm-relatorios";

const PAGINA = 1000;
const MAX_LINHAS = 50_000;
const DIA = 86_400_000;

/** Lê todas as linhas de uma consulta, de mil em mil (limite do PostgREST). */
async function tudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; de < MAX_LINHAS; de += PAGINA) {
    const { data, error } = await consulta(de, de + PAGINA - 1);
    if (error) throw error;
    const lote = (data as T[]) ?? [];
    linhas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return linhas;
}

/**
 * GET ?de=AAAA-MM-DD&ate=AAAA-MM-DD&funil=<id>&responsavel=<id|sem>
 * Relatórios do CRM: desempenho, tempo nas etapas, parados, atividades,
 * previsão por mês de fechamento e metas. Período padrão: últimos 6 meses.
 */
export async function GET(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;
  const { supabase, orgId } = ctx!;

  const url = new URL(req.url);
  const dia = /^\d{4}-\d{2}-\d{2}$/;
  const agora = Date.now();
  const deTxt = url.searchParams.get("de");
  const ateTxt = url.searchParams.get("ate");
  const de = deTxt && dia.test(deTxt) ? Date.parse(`${deTxt}T00:00:00-03:00`) : agora - 182 * DIA;
  const ate = ateTxt && dia.test(ateTxt) ? Date.parse(`${ateTxt}T23:59:59.999-03:00`) : agora;
  if (!(de <= ate)) return erro("Período inválido.");
  const funil = url.searchParams.get("funil") || null;
  const responsavel = url.searchParams.get("responsavel") || null;

  try {
    const [funis, membros, etapas, negocios, eventos, metas] = await Promise.all([
      listarFunis(supabase, orgId),
      listarMembros(supabase, orgId),
      tudo<EtapaRel>((a, b) =>
        supabase.from("pipeline_stages").select("id, nome, pipeline_id, ordem_estagio, probabilidade").eq("organizacao_id", orgId).range(a, b)
      ),
      tudo<NegocioRel>((a, b) =>
        supabase
          .from("lead_pipeline")
          .select("id, company_id, stage_id, pipeline_id, responsavel_id, valor_oportunidade, titulo, data_prevista, motivo_perda, criado_em, atualizado_em")
          .eq("organizacao_id", orgId)
          .order("id")
          .range(a, b)
      ),
      tudo<EventoRel>((a, b) =>
        supabase
          .from("pipeline_historico")
          .select("lead_pipeline_id, tipo_evento, stage_origem_id, stage_destino_id, usuario_id, dados, criado_em")
          .eq("organizacao_id", orgId)
          .in("tipo_evento", ["mudanca_estagio", "lead_adicionado", "atividade", "atividade_programada"])
          .order("id")
          .range(a, b)
      ),
      tudo<MetaRel>((a, b) =>
        supabase.from("crm_metas").select("id, usuario_id, pipeline_id, tipo, periodo, alvo").eq("organizacao_id", orgId).order("criado_em").range(a, b)
      ),
    ]);

    // Nomes das empresas só dos negócios (para a lista de parados).
    const idsEmpresas = [...new Set(negocios.map((n) => n.company_id))];
    const empresas = new Map<string, string>();
    for (let i = 0; i < idsEmpresas.length; i += 300) {
      const { data } = await supabase
        .from("companies")
        .select("id, razao_social, nome_fantasia")
        .eq("organizacao_id", orgId)
        .in("id", idsEmpresas.slice(i, i + 300));
      for (const c of (data ?? []) as Array<{ id: string; razao_social: string | null; nome_fantasia: string | null }>) empresas.set(c.id, nomeOrganizacao(c));
    }

    const relatorio = calcularRelatorios({
      etapas,
      negocios,
      eventos,
      metas: metas.map((m) => ({ ...m, alvo: Number(m.alvo) })),
      membros: new Map(membros.map((m) => [m.usuario_id, m.nome || m.email || "Membro"])),
      empresas,
      de,
      ate,
      agora,
      funil: funil && funis.some((f) => f.id === funil) ? funil : null,
      responsavel,
    });

    return NextResponse.json({
      periodo: { de: new Date(de).toISOString(), ate: new Date(ate).toISOString() },
      funis,
      membros: membros.map((m) => ({ usuario_id: m.usuario_id, nome: m.nome || m.email || "Membro" })),
      ...relatorio,
    });
  } catch (e) {
    console.error("Relatórios do CRM:", e);
    return erro("Não conseguimos montar os relatórios agora.", 500);
  }
}
