import { criarClienteSupabaseAdmin } from "./supabase/admin";

/*
 * Leva um pedido do site do estúdio (/fr, /en, /es) para o CRM da FP Pipe:
 * cria a empresa (origem "site"), o contato, o lead no primeiro estágio e
 * uma tarefa "Responder pedido do site" para hoje, com a mensagem.
 *
 * O destino é a organização do dono (Fernando). Pode ser trocado pelas
 * variáveis STUDIO_CRM_ORG_ID / STUDIO_CRM_USUARIO_ID sem mexer no código.
 */

const ORG_ID = process.env.STUDIO_CRM_ORG_ID ?? "6f1241d5-579c-46d7-8a00-9cf28b14865e";
const USUARIO_ID = process.env.STUDIO_CRM_USUARIO_ID ?? "f395a6b1-9d16-4b80-b97a-8dfdf13ededa";

export type PedidoSite = {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  mensagem: string;
  idioma: string;
};

export async function registrarPedidoNoCrm(
  pedido: PedidoSite
): Promise<{ ok: boolean; leadId?: string; motivo?: string }> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { ok: false, motivo: "sem_admin" };

  const email = pedido.email.toLowerCase();
  const nomeEmpresa = pedido.empresa || pedido.nome;
  const idioma = pedido.idioma.toUpperCase();

  // Garante que a organização tem os estágios do funil.
  let { data: estagio } = await admin
    .from("pipeline_stages")
    .select("id")
    .eq("organizacao_id", ORG_ID)
    .order("ordem_estagio", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!estagio) {
    await admin.rpc("_crm_seed_estagios", { org_id: ORG_ID });
    ({ data: estagio } = await admin
      .from("pipeline_stages")
      .select("id")
      .eq("organizacao_id", ORG_ID)
      .order("ordem_estagio", { ascending: true })
      .limit(1)
      .maybeSingle());
  }
  if (!estagio) return { ok: false, motivo: "sem_estagio" };

  // Mesma pessoa escrevendo de novo: reaproveita a empresa já criada.
  const { data: existente } = await admin
    .from("companies")
    .select("id")
    .eq("organizacao_id", ORG_ID)
    .eq("origem", "site")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  let companyId = existente?.id as string | undefined;

  if (!companyId) {
    const { data: nova, error } = await admin
      .from("companies")
      .insert({
        usuario_id: USUARIO_ID,
        organizacao_id: ORG_ID,
        nome_fantasia: nomeEmpresa,
        razao_social: nomeEmpresa,
        email,
        telefone: pedido.telefone || null,
        decisor_nome: pedido.nome,
        segmento_icp: "Criação de sites",
        fonte: "site",
        origem: "site",
        informacoes_adicionais: `Pedido pelo site do estúdio (${idioma}):\n${pedido.mensagem}`,
      })
      .select("id")
      .single();
    if (error || !nova) {
      console.error("Studio → CRM: falha ao criar empresa:", error?.message);
      return { ok: false, motivo: "empresa" };
    }
    companyId = nova.id as string;

    await admin.from("contatos").insert({
      usuario_id: USUARIO_ID,
      organizacao_id: ORG_ID,
      company_id: companyId,
      nome: pedido.nome,
      empresa: nomeEmpresa,
      email,
      emails: [email],
      telefones: pedido.telefone ? [pedido.telefone] : [],
      origem: "site",
    });
  }

  // Lead no funil (se já existir, só acrescenta a nova tarefa).
  let { data: lead } = await admin
    .from("lead_pipeline")
    .select("id")
    .eq("organizacao_id", ORG_ID)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!lead) {
    const { count } = await admin
      .from("lead_pipeline")
      .select("id", { count: "exact", head: true })
      .eq("organizacao_id", ORG_ID)
      .eq("stage_id", estagio.id);

    const { data: novoLead, error } = await admin
      .from("lead_pipeline")
      .insert({
        organizacao_id: ORG_ID,
        company_id: companyId,
        stage_id: estagio.id,
        responsavel_id: USUARIO_ID,
        ordenacao: count ?? 0,
        produto: "Site",
      })
      .select("id")
      .single();
    if (error || !novoLead) {
      console.error("Studio → CRM: falha ao criar lead:", error?.message);
      return { ok: false, motivo: "lead" };
    }
    lead = novoLead;

    await admin.from("pipeline_historico").insert({
      organizacao_id: ORG_ID,
      lead_pipeline_id: lead.id,
      company_id: companyId,
      usuario_id: null,
      tipo_evento: "lead_adicionado",
      stage_destino_id: estagio.id,
      dados: { responsavel_id: USUARIO_ID, origem: "site", idioma },
    });
  }

  // Tarefa para hoje: aparece no card do lead e nas pendências do painel.
  await admin.from("pipeline_historico").insert({
    organizacao_id: ORG_ID,
    lead_pipeline_id: lead.id,
    company_id: companyId,
    usuario_id: USUARIO_ID,
    tipo_evento: "atividade",
    dados: {
      tipo_atividade: "tarefa",
      titulo: `Responder pedido do site (${idioma}) — ${pedido.nome}`,
      observacao: [
        pedido.mensagem,
        "",
        `E-mail: ${email}`,
        pedido.telefone ? `Telefone: ${pedido.telefone}` : "",
      ]
        .filter((l, i) => l !== "" || i === 1)
        .join("\n"),
      data_hora_atividade: new Date().toISOString(),
      origem: "site",
    },
  });

  return { ok: true, leadId: lead.id as string };
}
