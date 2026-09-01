import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { calcularPrioridade } from "../../../lib/prioridade";

type Estagio = {
  id: string;
  organizacao_id: string;
  nome: string;
  ordem_estagio: number;
  cor: string;
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
};

type Empresa = {
  id: string;
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
  const agora = new Date();
  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  ).getTime();
  const fimHoje = inicioHoje + 86400000 - 1;
  if (ts < inicioHoje) return "atrasada";
  if (ts <= fimHoje) return "hoje";
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

export async function GET() {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, orgId } = ctx!;

  await garantirEstagios(supabase, orgId);

  const [{ data: estagios }, { data: leads }] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, nome, cor, ordem_estagio, criado_em")
      .eq("organizacao_id", orgId)
      .order("ordem_estagio", { ascending: true }),
    supabase
      .from("lead_pipeline")
      .select("id, company_id, stage_id, responsavel_id, ordenacao, valor_oportunidade, produto, criado_em, atualizado_em")
      .eq("organizacao_id", orgId),
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
        "id, razao_social, nome_fantasia, cnpj, segmento_icp, municipio, uf, score, score_motivo, email, telefone, linkedin, origem, decisor_nome, decisor_cargo, campeao_nome, campeao_cargo, campeao_email, campeao_telefone, campeao_linkedin, aprovador_nome, aprovador_cargo, aprovador_email, aprovador_telefone, aprovador_linkedin, cargo_prioritario, porte, cnae_descricao, capital_social, data_abertura, confirmado, endereco, informacoes_adicionais, interpretacao_ia"
      )
      .in(
        "id",
        leadsArr.map((l) => l.company_id)
      );
    empresas = (data as Empresa[]) ?? [];
  }
  const mapaEmpresa = new Map<string, Empresa>();
  for (const e of empresas) mapaEmpresa.set(e.id, e);

  // Resolve nomes dos responsáveis (membros da org) via perfil + email_convite.
  const membros: Array<{ usuario_id: string; nome: string | null; email: string | null }> =
    [];
  const idsMembrosNaoResolvidos = new Set(
    leadsArr.map((l) => l.responsavel_id).filter((id): id is string => Boolean(id))
  );
  if (idsMembrosNaoResolvidos.size > 0) {
    const ids = Array.from(idsMembrosNaoResolvidos);

    const [{ data: membrosData }, { data: perfisData }] = await Promise.all([
      supabase
        .from("organizacao_membros")
        .select("usuario_id, email_convite")
        .eq("organizacao_id", orgId)
        .in("usuario_id", ids),
      supabase
        .from("perfil")
        .select("usuario_id, nome_usuario")
        .in("usuario_id", ids),
    ]);

    const mapaEmail = new Map<string, string | null>();
    for (const m of (membrosData ?? []) as Array<{ usuario_id: string; email_convite: string | null }>) {
      mapaEmail.set(m.usuario_id, m.email_convite);
    }
    const mapaNome = new Map<string, string | null>();
    for (const p of (perfisData ?? []) as Array<{ usuario_id: string; nome_usuario: string | null }>) {
      mapaNome.set(p.usuario_id, p.nome_usuario);
    }

    for (const id of ids) {
      membros.push({
        usuario_id: id,
        nome: mapaNome.get(id) ?? null,
        email: mapaEmail.get(id) ?? null,
      });
    }
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
      .limit(600);

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
      criado_em: l.criado_em,
      atualizado_em: l.atualizado_em,
      company: c ?? null,
      ultimo_evento: ultimoEventoPorCompany.get(l.company_id) ?? null,
      proxima_atividade: ativ ?? null,
      atividade_status: ativ
        ? statusDeAtividade(new Date(ativ.data_hora_atividade).getTime())
        : "sem",
      prioridade,
    };
  });

  return NextResponse.json({
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

  let body: { company_id?: string };
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
    .single();

  if (erroEmpresa || !empresa) {
    return NextResponse.json(
      { erro: "Empresa não encontrada nesta organização." },
      { status: 404 }
    );
  }

  // Verifica se já está no pipeline
  const { data: jaExiste } = await supabase
    .from("lead_pipeline")
    .select("id")
    .eq("organizacao_id", orgId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (jaExiste) {
    return NextResponse.json(
      { erro: "Esta empresa já está no pipeline." },
      { status: 409 }
    );
  }

  // Estágio inicial = primeira coluna (maior prioridade = ordem 1)
  const { data: primeiro } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("organizacao_id", orgId)
    .order("ordem_estagio", { ascending: true })
    .limit(1)
    .maybeSingle();

  const stageId = primeiro?.id ?? null;
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
    })
    .select("id, company_id, stage_id, responsavel_id, ordenacao, criado_em")
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
