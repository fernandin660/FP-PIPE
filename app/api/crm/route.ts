import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { calcularPrioridade } from "../../../lib/prioridade";
import { limitesDeHojeBrasilia, listarMembros, resolverFunil } from "../../../lib/crm";

type Estagio = {
  id: string;
  organizacao_id: string;
  nome: string;
  ordem_estagio: number;
  cor: string;
  probabilidade: number | null;
  criado_em: string;
};

type EstaQuint = {
  id: string;
  company_id: string;
  stage_id: string;
  responsavel_id: string | null;
  ordenacao: number;
  criado_em: string;
  atualizado_em: string;
  valor_oportunidade: number | null;
  produto: string | null;
  motivo_perda: string | null;
  pipeline_id: string;
  titulo: string | null;
  pessoa_id: string | null;
  data_prevista: string | null;
  campos: Record<string, unknown> | null;
  alerta?: string | null;
  alerta_em?: string | null;
};

type Empresa = {
  id: string;
  campos?: Record<string, unknown> | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  segmento_icp: string | null;
  municipio: string | null;
  uf: string | null;
  score: number | null;
  score_motivo: string | null;
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  origem: string | null;
  decisor_nome: string | null;
  decisor_cargo: string | null;
  campeao_nome: string | null;
  campeao_cargo: string | null;
  campeao_email: string | null;
  campeao_telefone: string | null;
  campeao_linkedin: string | null;
  aprovador_nome: string | null;
  aprovador_cargo: string | null;
  aprovador_email: string | null;
  aprovador_telefone: string | null;
  aprovador_linkedin: string | null;
  cargo_prioritario: string | null;
  porte: string | null;
  cnae_descricao: string | null;
  capital_social: number | null;
  data_abertura: string | null;
  confirmado: boolean | null;
  endereco: string | null;
  informacoes_adicionais: string | null;
  interpretacao_ia: string | null;
};

type EventoHistorico = {
  id: string;
  company_id: string;
  tipo_evento: string;
  dados: Record<string, unknown>;
  stage_origem_nome: string | null;
  stage_destino_nome: string | null;
  usuario_nome: string | null;
  criado_em: string;
};

// Status da próxima atividade de um lead (dado o timestamp da data/hora).
function statusDeAtividade(ts: number): "sem" | "atrasada" | "hoje" | "futura" {
  // O servidor roda em UTC: "hoje" é calculado no horário de Brasília,
  // senão atividades da noite apareciam como "futura"/"atrasada" erradas.
  const { inicio, fim } = limitesDeHojeBrasilia();
  if (ts < inicio) return "atrasada";
  if (ts <= fim) return "hoje";
  return "futura";
}

async function garantirEstagios(
  supabase: NonNullable<Awaited<ReturnType<typeof import("../../../lib/supabase/server").criarClienteSupabaseServidor>>>,
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

export async function GET(request: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, orgId } = ctx!;

  await garantirEstagios(supabase, orgId);

  // Funil exibido: ?funil=<id> (se for da organização) ou o padrão.
  const pedido = new URL(request.url).searchParams.get("funil");
  const { funis, funil } = await resolverFunil(supabase, orgId, pedido);
  if (!funil) {
    return NextResponse.json({ erro: "Funil não configurado." }, { status: 500 });
  }

  const [{ data: estagios }, { data: leads }, { data: camposDef }] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, nome, cor, ordem_estagio, probabilidade, criado_em")
      .eq("organizacao_id", orgId)
      .eq("pipeline_id", funil.id)
      .order("ordem_estagio", { ascending: true }),
    supabase
      .from("lead_pipeline")
      .select("id, company_id, stage_id, responsavel_id, ordenacao, valor_oportunidade, produto, motivo_perda, pipeline_id, titulo, pessoa_id, data_prevista, campos, alerta, alerta_em, criado_em, atualizado_em")
      .eq("organizacao_id", orgId)
      .eq("pipeline_id", funil.id),
    supabase
      .from("crm_campos")
      .select("id, entidade, nome, tipo, opcoes, ordem")
      .eq("organizacao_id", orgId)
      .order("ordem", { ascending: true }),
  ]);

  const estagiosArr = (estagios as Estagio[]) ?? [];
  const leadsArr = (leads as EstaQuint[]) ?? [];

  const mapaStageNome = new Map<string, string>();
  for (const s of estagiosArr) mapaStageNome.set(s.id, s.nome);

  let empresas: Empresa[] = [];
  if (leadsArr.length > 0) {
    const { data } = await supabase
      .from("companies")
      .select(
        "id, razao_social, nome_fantasia, cnpj, segmento_icp, municipio, uf, score, score_motivo, email, telefone, linkedin, origem, decisor_nome, decisor_cargo, campeao_nome, campeao_cargo, campeao_email, campeao_telefone, aprovador_email, aprovador_telefone, cargo_prioritario, porte, capital_social, data_abertura, confirmado, endereco, campos"
      )
      // Escopo por organização: o CRM só resolve empresas da org atual.
      // Isso impede vazar dados cross-org e esconde empresas legadas (org NULL).
      .eq("organizacao_id", orgId)
      .in(
        "id",
        leadsArr.map((l) => l.company_id)
      );
    empresas = (data as Empresa[]) ?? [];
  }
  const mapaEmpresa = new Map<string, Empresa>();
  for (const e of empresas) mapaEmpresa.set(e.id, e);

  // Pessoa de contato de cada negócio.
  const idsPessoas = [...new Set(leadsArr.map((l) => l.pessoa_id).filter((x): x is string => Boolean(x)))];
  const mapaPessoa = new Map<string, { id: string; nome: string | null; cargo: string | null; email: string | null; telefone: string | null }>();
  if (idsPessoas.length > 0) {
    const { data: pessoas } = await supabase
      .from("contatos")
      .select("id, nome, cargo, email, telefone")
      .eq("organizacao_id", orgId)
      .in("id", idsPessoas);
    for (const p of (pessoas ?? []) as Array<{ id: string; nome: string | null; cargo: string | null; email: string | null; telefone: string | null }>) {
      mapaPessoa.set(p.id, p);
    }
  }

  // Toda a equipe (para escolher responsável e mostrar quem fez cada ação),
  // mais quem ainda aparece como responsável mas saiu da organização.
  const membros: Array<{ usuario_id: string; nome: string | null; email: string | null }> =
    await listarMembros(supabase, orgId);
  const idsConhecidos = new Set(membros.map((m) => m.usuario_id));
  const idsAntigos = [
    ...new Set(leadsArr.map((l) => l.responsavel_id).filter((id): id is string => Boolean(id) && !idsConhecidos.has(id as string))),
  ];
  if (idsAntigos.length > 0) {
    const { data: perfisAntigos } = await supabase
      .from("perfil")
      .select("usuario_id, nome_usuario")
      .in("usuario_id", idsAntigos);
    const nomes = new Map(((perfisAntigos ?? []) as Array<{ usuario_id: string; nome_usuario: string | null }>).map((p) => [p.usuario_id, p.nome_usuario]));
    for (const id of idsAntigos) membros.push({ usuario_id: id, nome: nomes.get(id) ?? null, email: null });
  }
  const mapaMembro = new Map<string, { nome: string | null; email: string | null }>();
  for (const m of membros) mapaMembro.set(m.usuario_id, m);

  // Último evento por lead (uma única consulta, agrupada no servidor).
  const ultimoEventoPorCompany = new Map<string, EventoHistorico>();
  // Próxima atividade pendente por lead (para a barra de status no Kanban).
  const proximaAtividadePorCompany = new Map<
    string,
    { id: string; tipo_atividade: string; titulo: string; data_hora_atividade: string }
  >();
  // Engagement por lead (para a prioridade determinística).
  const numAtividadesPorCompany = new Map<string, number>();
  const ultimaAtividadePorCompany = new Map<string, string>();
  if (leadsArr.length > 0) {
    const { data: eventos } = await supabase
      .from("pipeline_historico")
      .select("id, company_id, tipo_evento, dados, stage_origem_id, stage_destino_id, usuario_id, criado_em")
      .eq("organizacao_id", orgId)
      .in(
        "company_id",
        leadsArr.map((l) => l.company_id)
      )
      .order("criado_em", { ascending: false })
      .limit(1000);

    for (const ev of (eventos ?? []) as Array<{
      id: string;
      company_id: string;
      tipo_evento: string;
      dados: Record<string, unknown>;
      stage_origem_id: string | null;
      stage_destino_id: string | null;
      usuario_id: string | null;
      criado_em: string;
    }>) {
      if (!ultimoEventoPorCompany.has(ev.company_id)) {
        const membro = ev.usuario_id ? mapaMembro.get(ev.usuario_id) : null;
        ultimoEventoPorCompany.set(ev.company_id, {
          id: ev.id,
          company_id: ev.company_id,
          tipo_evento: ev.tipo_evento,
          dados: ev.dados,
          stage_origem_nome: ev.stage_origem_id ? mapaStageNome.get(ev.stage_origem_id) ?? null : null,
          stage_destino_nome: ev.stage_destino_id ? mapaStageNome.get(ev.stage_destino_id) ?? null : null,
          usuario_nome:
            membro?.nome ?? membro?.email ?? null,
          criado_em: ev.criado_em,
        });
      }

      if (
        ev.tipo_evento === "atividade_programada" ||
        ev.tipo_evento === "atividade"
      ) {
        const dados = (ev.dados ?? {}) as Record<string, unknown>;
        if (dados.cancelada === true || dados.concluida === true) continue;
        numAtividadesPorCompany.set(
          ev.company_id,
          (numAtividadesPorCompany.get(ev.company_id) ?? 0) + 1
        );
        const atualAtiv = ultimaAtividadePorCompany.get(ev.company_id);
        if (!atualAtiv || ev.criado_em > atualAtiv) {
          ultimaAtividadePorCompany.set(ev.company_id, ev.criado_em);
        }
        const dataHora =
          typeof dados.data_hora_atividade === "string"
            ? dados.data_hora_atividade
            : "";
        if (!dataHora) continue;
        const atual = proximaAtividadePorCompany.get(ev.company_id);
        if (
          !atual ||
          new Date(dataHora).getTime() <
            new Date(atual.data_hora_atividade).getTime()
        ) {
          proximaAtividadePorCompany.set(ev.company_id, {
            id: ev.id,
            tipo_atividade:
              typeof dados.tipo_atividade === "string"
                ? dados.tipo_atividade
                : "tarefa",
            titulo: typeof dados.titulo === "string" ? dados.titulo : "Atividade",
            data_hora_atividade: dataHora,
          });
        }
      }
    }
  }

  // Sinais comerciais relevantes (relevancia >= 50) por lead — uma única
  // consulta em batch para não gerar N+1.
  const numSinaisPorCompany = new Map<string, number>();
  if (leadsArr.length > 0) {
    const { data: sinaisAgrup } = await supabase
      .from("company_sinais")
      .select("company_id")
      .eq("organizacao_id", orgId)
      .gte("relevancia", 50)
      .in(
        "company_id",
        leadsArr.map((l) => l.company_id)
      );
    for (const s of (sinaisAgrup ?? []) as Array<{ company_id: string }>) {
      numSinaisPorCompany.set(
        s.company_id,
        (numSinaisPorCompany.get(s.company_id) ?? 0) + 1
      );
    }
  }

  // Contatos vinculados com e-mail/telefone disponível por lead (para o
  // fator "decisor com contato") — também em batch, sem N+1.
  const contatosDisponiveisPorCompany = new Set<string>();
  if (leadsArr.length > 0) {
    const { data: contatosDisp } = await supabase
      .from("contatos")
      .select("company_id, email, emails, telefones")
      .eq("organizacao_id", orgId)
      .in(
        "company_id",
        leadsArr.map((l) => l.company_id)
      );
    for (const ct of (contatosDisp ?? []) as Array<{
      company_id: string;
      email: string | null;
      emails: string[] | null;
      telefones: string[] | null;
    }>) {
      if (
        ct.email ||
        (ct.emails?.length ?? 0) > 0 ||
        (ct.telefones?.length ?? 0) > 0
      ) {
        contatosDisponiveisPorCompany.add(ct.company_id);
      }
    }
  }

  const leadsResposta = leadsArr.map((l) => {
    const m = l.responsavel_id ? mapaMembro.get(l.responsavel_id) : null;
    const ativ = proximaAtividadePorCompany.get(l.company_id);
    const c = mapaEmpresa.get(l.company_id);
    const decisorContato = Boolean(
      c?.campeao_email ||
        c?.campeao_telefone ||
        c?.aprovador_email ||
        c?.aprovador_telefone ||
        contatosDisponiveisPorCompany.has(l.company_id)
    );
    const prioridade = calcularPrioridade({
      icpScore: c?.score ?? null,
      temSegmento: !!c?.segmento_icp,
      temPorte: !!c?.porte,
      capitalSocial:
        typeof c?.capital_social === "number" ? c.capital_social : null,
      dataAbertura: c?.data_abertura ?? null,
      temTelefone: !!c?.telefone,
      temEmail: !!c?.email,
      decisorIdentificado: Boolean(c?.decisor_nome || c?.campeao_nome),
      decisorContato,
      confirmado: c?.confirmado === true,
      numSinais: numSinaisPorCompany.get(l.company_id) ?? 0,
      numAtividades: numAtividadesPorCompany.get(l.company_id) ?? 0,
      ultimaAtividadeEm: ultimaAtividadePorCompany.get(l.company_id) ?? null,
      stageNome: mapaStageNome.get(l.stage_id) ?? null,
    });
    return {
      id: l.id,
      company_id: l.company_id,
      stage_id: l.stage_id,
      responsavel_id: l.responsavel_id,
      responsavel: m
        ? { nome: m.nome, email: m.email }
        : null,
      ordenacao: l.ordenacao,
      valor_oportunidade: l.valor_oportunidade,
      produto: l.produto,
      motivo_perda: l.motivo_perda ?? null,
      pipeline_id: l.pipeline_id,
      titulo: l.titulo,
      pessoa_id: l.pessoa_id,
      pessoa: l.pessoa_id ? mapaPessoa.get(l.pessoa_id) ?? null : null,
      data_prevista: l.data_prevista,
      campos: l.campos ?? {},
      alerta: l.alerta ?? null,
      alerta_em: l.alerta_em ?? null,
      criado_em: l.criado_em,
      atualizado_em: l.atualizado_em,
      company: c ?? null,
      company_inconsistente: c ? false : true,
      ultimo_evento: ultimoEventoPorCompany.get(l.company_id) ?? null,
      proxima_atividade: ativ ?? null,
      atividade_status: ativ
        ? statusDeAtividade(new Date(ativ.data_hora_atividade).getTime())
        : "sem",
      prioridade,
    };
  });

  return NextResponse.json({
    funis,
    funil_atual: funil.id,
    campos: camposDef ?? [],
    stages: estagiosArr,
    leads: leadsResposta,
    membros: membros.map((m) => ({
      usuario_id: m.usuario_id,
      nome: m.nome,
      email: m.email,
    })),
  });
}

export async function POST(req: Request) {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, orgId, usuarioId } = ctx!;

  let body: {
    company_id?: string;
    pipeline_id?: string;
    stage_id?: string;
    titulo?: string;
    valor_oportunidade?: number | null;
    pessoa_id?: string | null;
    data_prevista?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const companyId = body.company_id;
  if (!companyId || typeof companyId !== "string") {
    return NextResponse.json(
      { erro: "company_id é obrigatório." },
      { status: 400 }
    );
  }

  await garantirEstagios(supabase, orgId);

  // Valida que a empresa pertence à org (RLS também protege o select).
  const { data: empresa, error: erroEmpresa } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("organizacao_id", orgId)
    .single();

  if (erroEmpresa || !empresa) {
    return NextResponse.json(
      { erro: "Empresa não encontrada nesta organização." },
      { status: 404 }
    );
  }

  const { funil } = await resolverFunil(supabase, orgId, body.pipeline_id ?? null);
  if (!funil) {
    return NextResponse.json({ erro: "Funil não configurado." }, { status: 500 });
  }

  // Uma empresa tem no máximo um negócio por funil.
  const { data: jaExiste } = await supabase
    .from("lead_pipeline")
    .select("id")
    .eq("organizacao_id", orgId)
    .eq("company_id", companyId)
    .eq("pipeline_id", funil.id)
    .limit(1)
    .maybeSingle();

  if (jaExiste) {
    return NextResponse.json(
      { erro: `Esta empresa já tem um negócio no funil ${funil.nome}.` },
      { status: 409 }
    );
  }

  // Etapa pedida (se for deste funil) ou a primeira coluna.
  const { data: etapasFunil } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("organizacao_id", orgId)
    .eq("pipeline_id", funil.id)
    .order("ordem_estagio", { ascending: true });
  const idsEtapas = (etapasFunil ?? []).map((e) => e.id as string);
  const stageId = (body.stage_id && idsEtapas.includes(body.stage_id) ? body.stage_id : idsEtapas[0]) ?? null;

  // Pessoa precisa ser da organização.
  let pessoaId: string | null = null;
  if (typeof body.pessoa_id === "string" && body.pessoa_id) {
    const { data: pessoa } = await supabase
      .from("contatos")
      .select("id")
      .eq("id", body.pessoa_id)
      .eq("organizacao_id", orgId)
      .maybeSingle();
    if (!pessoa) {
      return NextResponse.json({ erro: "Pessoa não encontrada nesta organização." }, { status: 400 });
    }
    pessoaId = pessoa.id;
  }
  const titulo = typeof body.titulo === "string" ? body.titulo.trim().slice(0, 160) || null : null;
  const valor =
    typeof body.valor_oportunidade === "number" && Number.isFinite(body.valor_oportunidade) && body.valor_oportunidade >= 0
      ? body.valor_oportunidade
      : null;
  const dataPrevista =
    typeof body.data_prevista === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.data_prevista) ? body.data_prevista : null;
  if (!stageId) {
    return NextResponse.json(
      { erro: "Pipeline não configurado. Tente novamente." },
      { status: 500 }
    );
  }

  // Próxima ordenação dentro do estágio inicial
  const { count } = await supabase
    .from("lead_pipeline")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", orgId)
    .eq("stage_id", stageId);

  const ordenacao = count ?? 0;

  const { data: novo, error: erroInsert } = await supabase
    .from("lead_pipeline")
    .insert({
      organizacao_id: orgId,
      company_id: companyId,
      stage_id: stageId,
      responsavel_id: usuarioId,
      ordenacao,
      titulo,
      valor_oportunidade: valor,
      pessoa_id: pessoaId,
      data_prevista: dataPrevista,
    })
    .select("id, company_id, stage_id, pipeline_id, responsavel_id, ordenacao, criado_em")
    .single();

  if (erroInsert || !novo) {
    return NextResponse.json(
      { erro: "Não foi possível adicionar ao pipeline.", detalhe: erroInsert?.message },
      { status: 500 }
    );
  }

  await supabase.from("pipeline_historico").insert({
    organizacao_id: orgId,
    lead_pipeline_id: novo.id,
    company_id: companyId,
    usuario_id: usuarioId,
    tipo_evento: "lead_adicionado",
    stage_destino_id: stageId,
    dados: { responsavel_id: usuarioId },
  });

  return NextResponse.json({ lead: novo }, { status: 201 });
}
