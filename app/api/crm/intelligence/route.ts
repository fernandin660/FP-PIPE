import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { chamarIa } from "../../../../lib/ia";
import { calcularPrioridade } from "../../../../lib/prioridade";
import type { criarClienteSupabaseServidor } from "../../../../lib/supabase/server";

type Cliente = NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServidor>>>;

const TIPOS_SINAL = new Set([
  "contratacao",
  "expansao",
  "nova_filial",
  "mudanca_lideranca",
  "novo_decisor",
  "tecnologia",
  "crescimento",
  "evento",
  "outro",
]);

type EmpresaInteligencia = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  segmento_icp: string | null;
  municipio: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  linkedin: string | null;
  origem: string | null;
  score: number | null;
  score_motivo: string | null;
  decisor_nome: string | null;
  decisor_cargo: string | null;
  cargo_prioritario: string | null;
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
  porte: string | null;
  cnae_descricao: string | null;
  capital_social: number | null;
  data_abertura: string | null;
  confirmado: boolean | null;
  endereco: string | null;
  informacoes_adicionais: string | null;
  interpretacao_ia: string | null;
  organizacao_id: string | null;
};

type SinalRow = {
  id: string;
  tipo: string;
  descricao: string;
  data: string | null;
  fonte: string;
  confianca: number;
  relevancia: number;
  criado_em: string;
  criado_por: string | null;
};

type ContatoRow = {
  id: string;
  nome: string | null;
  cargo: string | null;
  email: string | null;
  emails: string[] | null;
  telefones: string[] | null;
  linkedin_url: string | null;
};

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function numero(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// Papéis de decisão derivados DO CARGO REAL (apenas heurística de rotulagem,
// nunca inventa o cargo — usa o cargo que já existe nos dados).
function papelDeCargo(cargo?: string | null): {
  papel: "decisor" | "aprovador" | "influenciador" | "contato";
  inferido: boolean;
} {
  const c = (cargo ?? "").toLowerCase();
  if (!c) return { papel: "contato", inferido: false };
  const decisor =
    /diretor|presidente|ceo|dono|socio|proprietario|fundador|executivo|ciso|cfo|coo/.test(c);
  if (decisor) return { papel: "decisor", inferido: true };
  const aprovador = /controller|financeiro|administrativo|legal|juridico|compras|rh/.test(c);
  if (aprovador) return { papel: "aprovador", inferido: true };
  const influenciador =
    /gerente|coord|supervisor|lider|head|chefe|consultor|analista/.test(c);
  if (influenciador) return { papel: "influenciador", inferido: true };
  return { papel: "contato", inferido: false };
}

const ROTULO_PAPEL: Record<string, string> = {
  decisor: "Decisor",
  aprovador: "Aprovador",
  influenciador: "Influenciador",
  campeao: "Campeão potencial",
  contato: "Contato",
};

async function carregarEmpresa(
  supabase: Cliente,
  orgId: string,
  companyId: string
): Promise<EmpresaInteligencia | null> {
  const { data } = await supabase
    .from("companies")
    .select(
      "id, razao_social, nome_fantasia, cnpj, segmento_icp, municipio, uf, telefone, email, linkedin, origem, score, score_motivo, decisor_nome, decisor_cargo, cargo_prioritario, campeao_nome, campeao_cargo, campeao_email, campeao_telefone, campeao_linkedin, aprovador_nome, aprovador_cargo, aprovador_email, aprovador_telefone, aprovador_linkedin, porte, cnae_descricao, capital_social, data_abertura, confirmado, endereco, informacoes_adicionais, interpretacao_ia, organizacao_id"
    )
    .eq("id", companyId)
    .eq("organizacao_id", orgId)
    .maybeSingle();
  return (data as EmpresaInteligencia | null) ?? null;
}

export async function GET(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId } = ctx!;

    const url = new URL(request.url);
    const companyId = url.searchParams.get("company_id");
    if (!companyId) {
      return NextResponse.json({ erro: "company_id é obrigatório." }, { status: 400 });
    }

    const empresa = await carregarEmpresa(supabase, orgId, companyId);
    if (!empresa) {
      return NextResponse.json(
        { erro: "Empresa não encontrada nesta organização." },
        { status: 404 }
      );
    }

    // --- Sinais (somente registros reais na tabela) ---
    const { data: sinaisData } = await supabase
      .from("company_sinais")
      .select("id, tipo, descricao, data, fonte, confianca, relevancia, criado_em, criado_por")
      .eq("organizacao_id", orgId)
      .eq("company_id", companyId)
      .order("criado_em", { ascending: false })
      .limit(50);
    const sinais = (sinaisData as SinalRow[] | null) ?? [];

    // --- Contatos (mapa de decisores) ---
    const { data: contatosData } = await supabase
      .from("contatos")
      .select("id, nome, cargo, email, emails, telefones, linkedin_url")
      .eq("organizacao_id", orgId)
      .eq("company_id", companyId)
      .order("criado_em", { ascending: true })
      .limit(50);
    const contatos = (contatosData as ContatoRow[] | null) ?? [];

    // --- Lead + estágio ---
    const { data: lead } = await supabase
      .from("lead_pipeline")
      .select("id, stage_id, responsavel_id")
      .eq("organizacao_id", orgId)
      .eq("company_id", companyId)
      .maybeSingle();

    let stageNome: string | null = null;
    const leadId = (lead as { stage_id: string | null } | null)?.stage_id ?? null;
    if (leadId) {
      const { data: estagio } = await supabase
        .from("pipeline_stages")
        .select("nome")
        .eq("id", leadId)
        .eq("organizacao_id", orgId)
        .maybeSingle();
      stageNome = (estagio as { nome: string } | null)?.nome ?? null;
    }

    // --- Engagement (atividades no histórico) ---
    let numAtividades = 0;
    let ultimaAtividadeEm: string | null = null;
    const { data: eventos } = await supabase
      .from("pipeline_historico")
      .select("tipo_evento, dados, criado_em")
      .eq("organizacao_id", orgId)
      .eq("company_id", companyId)
      .order("criado_em", { ascending: false })
      .limit(600);
    for (const ev of (eventos ?? []) as Array<{
      tipo_evento: string;
      dados: Record<string, unknown>;
      criado_em: string;
    }>) {
      if (ev.tipo_evento !== "atividade" && ev.tipo_evento !== "atividade_programada")
        continue;
      const dados = (ev.dados ?? {}) as Record<string, unknown>;
      if (dados.cancelada === true || dados.concluida === true) continue;
      numAtividades += 1;
      if (!ultimaAtividadeEm || ev.criado_em > ultimaAtividadeEm)
        ultimaAtividadeEm = ev.criado_em;
    }

    // --- Sinais relevantes (mesma regra do Kanban: relevancia >= 50) ---
    const numSinaisRelevantes = sinais.filter(
      (s) => (s.relevancia ?? 0) >= 50
    ).length;

    // --- Prioridade determinística ---
    const decisorContato = Boolean(
      empresa.campeao_email ||
        empresa.campeao_telefone ||
        empresa.aprovador_email ||
        empresa.aprovador_telefone ||
        contatos.some(
          (c) =>
            c.email || (c.emails?.length ?? 0) > 0 || (c.telefones?.length ?? 0) > 0
        )
    );
    const prioridade = calcularPrioridade({
      icpScore: empresa.score ?? null,
      temSegmento: !!empresa.segmento_icp,
      temPorte: !!empresa.porte,
      capitalSocial: typeof empresa.capital_social === "number" ? empresa.capital_social : null,
      dataAbertura: empresa.data_abertura ?? null,
      temTelefone: !!empresa.telefone,
      temEmail: !!empresa.email,
      decisorIdentificado: Boolean(empresa.decisor_nome || empresa.campeao_nome),
      decisorContato,
      confirmado: empresa.confirmado === true,
      numSinais: numSinaisRelevantes,
      numAtividades,
      ultimaAtividadeEm,
      stageNome,
    });

    // --- Mapa de decisores (dados reais: campos estruturados + contatos) ---
    const decisores: Array<{
      nome: string;
      cargo: string | null;
      email: string | null;
      telefone: string | null;
      linkedin: string | null;
      papel: string;
      rotulo: string;
      inferido: boolean;
      fonte: string;
    }> = [];

    if (empresa.decisor_nome) {
      decisores.push({
        nome: empresa.decisor_nome,
        cargo: empresa.decisor_cargo ?? null,
        email: empresa.email ?? null,
        telefone: empresa.telefone ?? null,
        linkedin: empresa.linkedin ?? null,
        papel: "decisor",
        rotulo: ROTULO_PAPEL.decisor,
        inferido: false,
        fonte: "dados cadastrais",
      });
    }
    if (empresa.aprovador_nome) {
      decisores.push({
        nome: empresa.aprovador_nome,
        cargo: empresa.aprovador_cargo ?? null,
        email: empresa.aprovador_email ?? null,
        telefone: empresa.aprovador_telefone ?? null,
        linkedin: empresa.aprovador_linkedin ?? null,
        papel: "aprovador",
        rotulo: ROTULO_PAPEL.aprovador,
        inferido: false,
        fonte: "dados cadastrais",
      });
    }
    if (empresa.campeao_nome) {
      decisores.push({
        nome: empresa.campeao_nome,
        cargo: empresa.campeao_cargo ?? null,
        email: empresa.campeao_email ?? null,
        telefone: empresa.campeao_telefone ?? null,
        linkedin: empresa.campeao_linkedin ?? null,
        papel: "campeao",
        rotulo: ROTULO_PAPEL.campeao,
        inferido: false,
        fonte: "dados cadastrais",
      });
    }
    // Evita duplicar um contato que já veio como decisor/campeão/aprovador.
    const nomesEstrut = new Set(
      [empresa.decisor_nome, empresa.aprovador_nome, empresa.campeao_nome]
        .filter((n): n is string => Boolean(n))
        .map((n) => n.toLowerCase())
    );
    for (const ct of contatos) {
      const nome = texto(ct.nome);
      if (!nome || nomesEstrut.has(nome.toLowerCase())) continue;
      const email = texto(ct.email) || (ct.emails?.[0] ?? "") || null;
      const telefone = ct.telefones?.[0] ?? null;
      const { papel, inferido } = papelDeCargo(ct.cargo);
      decisores.push({
        nome,
        cargo: ct.cargo ?? null,
        email,
        telefone,
        linkedin: ct.linkedin_url ?? null,
        papel,
        rotulo: ROTULO_PAPEL[papel],
        inferido,
        fonte: "contato salvo",
      });
    }

    // --- Fatos cadastrais relevantes (derivados só de dados reais) ---
    const fatos: string[] = [];
    if (empresa.porte) fatos.push(`Porte: ${empresa.porte}`);
    if (empresa.cnae_descricao) fatos.push(`Atividade: ${empresa.cnae_descricao}`);
    if (typeof empresa.capital_social === "number" && empresa.capital_social > 0)
      fatos.push(`Capital social: R$ ${empresa.capital_social.toLocaleString("pt-BR")}`);
    if (empresa.data_abertura) fatos.push(`Fundada em: ${empresa.data_abertura}`);
    if (empresa.segmento_icp) fatos.push(`Segmento: ${empresa.segmento_icp}`);
    if (empresa.confirmado === true) fatos.push("Dados empresariais confirmados");

    return NextResponse.json({
      empresa: {
        nome: empresa.nome_fantasia ?? empresa.razao_social ?? null,
        cnpj: empresa.cnpj ?? null,
        segmento_icp: empresa.segmento_icp ?? null,
      },
      interpretacao_ia: empresa.interpretacao_ia ?? null,
      prioridade,
      por_que_prospectar: prioridade.motivos,
      decisores,
      contatos_mapeados: contatos.length,
      sinais: sinais.map((s) => ({
        id: s.id,
        tipo: s.tipo,
        descricao: s.descricao,
        data: s.data ?? null,
        fonte: s.fonte,
        confianca: s.confianca,
        relevancia: s.relevancia,
        criado_em: s.criado_em,
      })),
      fatos_cadastrais: fatos,
      tipos_sinal: Array.from(TIPOS_SINAL),
      rotulo_papel: ROTULO_PAPEL,
    });
  } catch (erro) {
    console.error("Erro na inteligência da empresa:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos carregar a inteligência da empresa." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId, usuarioId } = ctx!;

    const url = new URL(request.url);
    const acao = url.searchParams.get("acao") ?? "";

    let body: {
      company_id?: unknown;
      tipo?: unknown;
      descricao?: unknown;
      data?: unknown;
      fonte?: unknown;
      confianca?: unknown;
      relevancia?: unknown;
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
    }

    const companyId = texto(body.company_id);
    if (!companyId) {
      return NextResponse.json({ erro: "company_id é obrigatório." }, { status: 400 });
    }

    const empresa = await carregarEmpresa(supabase, orgId, companyId);
    if (!empresa) {
      return NextResponse.json(
        { erro: "Empresa não encontrada nesta organização." },
        { status: 404 }
      );
    }

    // --- Adicionar sinal manual (dados reais fornecidos pelo usuário) ---
    if (acao === "adicionar_sinal") {
      const tipo = texto(body.tipo) || "outro";
      if (!TIPOS_SINAL.has(tipo)) {
        return NextResponse.json({ erro: "Tipo de sinal inválido." }, { status: 400 });
      }
      const descricao = texto(body.descricao);
      if (!descricao) {
        return NextResponse.json({ erro: "Descreva o sinal." }, { status: 400 });
      }
      const data = texto(body.data) || null;
      const fonte = texto(body.fonte) || "manual";
      const confianca = numero(body.confianca, 0, 100) ?? 50;
      const relevancia = numero(body.relevancia, 0, 100) ?? 50;

      const { data: novo, error: erroIns } = await supabase
        .from("company_sinais")
        .insert({
          organizacao_id: orgId,
          company_id: companyId,
          tipo,
          descricao,
          data: data || null,
          fonte,
          confianca,
          relevancia,
          criado_por: usuarioId,
        })
        .select("id, tipo, descricao, data, fonte, confianca, relevancia, criado_em")
        .single();

      if (erroIns || !novo) {
        return NextResponse.json(
          { erro: "Não foi possível salvar o sinal." },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, sinal: novo });
    }

    // --- Gerar interpretação comercial (IA, usando só dados reais) ---
    if (acao === "gerar_interpretacao") {
      const { data: perfil } = await supabase
        .from("perfil")
        .select("nome_empresa, area_atuacao, departamento_uso, produtos_servicos, nichos")
        .eq("usuario_id", usuarioId)
        .maybeSingle();

      const { data: contatosData } = await supabase
        .from("contatos")
        .select("nome, cargo")
        .eq("organizacao_id", orgId)
        .eq("company_id", companyId)
        .order("criado_em", { ascending: true })
        .limit(30);
      const contatosTexto = ((contatosData ?? []) as Array<{ nome: string | null; cargo: string | null }>)
        .map((c) => `${c.nome ?? ""} (${c.cargo ?? "sem cargo"})`)
        .filter((t) => t.trim().length > 2)
        .join("; ");

      const dadosEmpresa = [
        `Razão social: ${empresa.razao_social || "não informado"}`,
        `Nome fantasia: ${empresa.nome_fantasia || "não informado"}`,
        `Segmento (ICP): ${empresa.segmento_icp || "não informado"}`,
        `Atividade (CNAE): ${empresa.cnae_descricao || "não informado"}`,
        `Porte: ${empresa.porte || "não informado"}`,
        `Capital social: ${typeof empresa.capital_social === "number" ? `R$ ${empresa.capital_social.toLocaleString("pt-BR")}` : "não informado"}`,
        `Fundada em: ${empresa.data_abertura || "não informado"}`,
        `Localização: ${[empresa.municipio, empresa.uf].filter(Boolean).join(" - ") || "não informado"}`,
        `Decisor cadastrado: ${
          empresa.decisor_nome ? `${empresa.decisor_nome}${empresa.decisor_cargo ? " (" + empresa.decisor_cargo + ")" : ""}` : "não informado"
        }`,
        `Campeão: ${empresa.campeao_nome || "não informado"}`,
        `Contatos na empresa: ${contatosTexto || "não informado"}`,
        `Score de ICP: ${empresa.score ?? "não informado"} / 100`,
        `Informações adicionais: ${empresa.informacoes_adicionais || "não informado"}`,
      ].join("\n");

      const produto = [
        (perfil as { nome_empresa?: string | null } | null)?.nome_empresa,
        (perfil as { produtos_servicos?: string | null } | null)?.produtos_servicos,
        (perfil as { area_atuacao?: string | null } | null)?.area_atuacao,
      ]
        .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        .join(" · ");

      const prompt = `Você é um analista comercial B2B. Interprete a empresa abaixo apenas com os DADOS REAIS listados.

QUEM VENDE (contexto do produto, use apenas se informado — você NÃO deve inventar nada que não esteja aqui):
${produto || "não informado"}

EMPRESA (dados cadastrais reais):
${dadosEmpresa}

TAREFA: escreva uma interpretação comercial (máximo 4 frases) que um vendedor usaria para abordar essa empresa. Use SOMENTE os dados fornecidos. Se os dados forem insuficientes para uma conclusão confiável, escreva literalmente: "Dados insuficientes para uma interpretação confiável." Não invente fatos, números ou sinais. Não use markdown.

Retorne somente JSON válido no formato {"interpretacao":"..."}`;

      let interpretacao: string;
      try {
        const resposta = await chamarIa(prompt, {
          maxTokens: 500,
          temperature: 0.4,
          timeoutMs: 45000,
        });
        const parsed = JSON.parse(resposta.response) as { interpretacao?: string };
        interpretacao = texto(parsed.interpretacao);
      } catch (erro) {
        console.error("Falha na IA de interpretação:", erro);
        return NextResponse.json(
          { erro: "Não foi possível gerar a interpretação agora. Tente novamente." },
          { status: 500 }
        );
      }

      if (!interpretacao) {
        return NextResponse.json(
          { erro: "A IA não retornou uma interpretação válida." },
          { status: 500 }
        );
      }

      await supabase
        .from("companies")
        .update({ interpretacao_ia: interpretacao })
        .eq("id", companyId)
        .eq("organizacao_id", orgId);

      return NextResponse.json({ ok: true, interpretacao_ia: interpretacao });
    }

    return NextResponse.json({ erro: "Ação desconhecida." }, { status: 400 });
  } catch (erro) {
    console.error("Erro ao processar inteligência:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos processar a inteligência da empresa." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId } = ctx!;

    const url = new URL(request.url);
    const sinalId = url.searchParams.get("sinal_id");
    if (!sinalId) {
      return NextResponse.json({ erro: "sinal_id é obrigatório." }, { status: 400 });
    }

    const { error: erroDel } = await supabase
      .from("company_sinais")
      .delete()
      .eq("id", sinalId)
      .eq("organizacao_id", orgId);

    if (erroDel) {
      return NextResponse.json(
        { erro: "Não foi possível remover o sinal." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao remover sinal:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos remover o sinal." },
      { status: 500 }
    );
  }
}
