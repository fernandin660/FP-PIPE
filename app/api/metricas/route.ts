import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";

const LIMITE_HISTORICO = 8000;

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function multiplicadorMes(dias_ultimos: number): number {
  // Um "mês" de referência: 30 dias. Retorna quantos intervalo usar.
  return dias_ultimos || 30;
}

export async function GET(request: Request) {
  try {
    const { ctx, resposta } = await exigirAcesso();
    if (resposta) return resposta;
    const { supabase, orgId } = ctx!;

    const url = new URL(request.url);
    const de = url.searchParams.get("de") ?? undefined; // ISO
    const ate = url.searchParams.get("ate") ?? undefined; // ISO
    const dias = url.searchParams.get("dias"); // 30/60/90 ou vazio

    // Lista de estágios (ordem/pipeline).
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("id, nome, cor, ordem_estagio")
      .eq("organizacao_id", orgId)
      .order("ordem_estagio", { ascending: true });

    const listaStages = (stages ?? []) as Array<{
      id: string;
      nome: string;
      cor: string;
      ordem_estagio: number;
    }>;

    // Filtro temporal aplicado a criado_em nas tabelas de eventos.
    const filtroHistorico: Record<string, unknown> = {};
    if (de) filtroHistorico.gte = de;
    if (ate) filtroHistorico.lte = ate;

    const [
      { data: pipeLinhas },
      { data: histLinhas },
      { data: empresasLinhas },
      { data: contatosLinhas },
      { data: listasLinhas },
    ] = await Promise.all([
      supabase
        .from("lead_pipeline")
        .select(
          "stage_id, responsavel_id, valor_oportunidade, produto, criado_em"
        )
        .eq("organizacao_id", orgId),
      supabase
        .from("pipeline_historico")
        .select(
          "company_id, tipo_evento, dados, stage_origem_id, stage_destino_id, usuario_id, criado_em"
        )
        .eq("organizacao_id", orgId)
        .order("criado_em", { ascending: true })
        .limit(LIMITE_HISTORICO),
      supabase
        .from("companies")
        .select("usuario_id, origem, criado_em")
        .eq("organizacao_id", orgId),
      supabase
        .from("contatos")
        .select("usuario_id, criado_em")
        .eq("organizacao_id", orgId),
      supabase
        .from("listas")
        .select("criado_em")
        .eq("organizacao_id", orgId),
    ]);

    const pipelines = (pipeLinhas ?? []) as Array<{
      stage_id: string;
      responsavel_id: string | null;
      valor_oportunidade: number | null;
      produto: string | null;
      criado_em: string;
    }>;
    const eventos = (histLinhas ?? []) as Array<{
      company_id: string;
      tipo_evento: string;
      dados: Record<string, unknown>;
      stage_origem_id: string | null;
      stage_destino_id: string | null;
      usuario_id: string | null;
      criado_em: string;
    }>;
    const empresas = (empresasLinhas ?? []) as Array<{
      usuario_id: string;
      origem: string | null;
      criado_em: string;
    }>;
    const contatos = (contatosLinhas ?? []) as Array<{
      usuario_id: string;
      criado_em: string;
    }>;
    const listas = (listasLinhas ?? []) as Array<{ criado_em: string }>;

    const mapaNomeStage = new Map<string, string>();
    for (const s of listaStages) mapaNomeStage.set(s.id, s.nome);

    const ehStage = (nome: string, token: string) =>
      (nome || "").toUpperCase().includes(token);

    // ---- Funil: estado atual por estágio ----
    const funil = listaStages.map((s) => ({
      id: s.id,
      nome: s.nome,
      cor: s.cor,
      ordem: s.ordem_estagio,
      atual: 0,
      valorAtual: 0,
    }));
    const mapaIndiceStage = new Map<string, number>();
    listaStages.forEach((s, i) => mapaIndiceStage.set(s.id, i));

    let ganhos = 0; // leads atuais em estágio GANHO
    let perdidos = 0; // leads atuais em estágio PERDIDO
    let valorPipeline = 0;
    let oportunidadesAbertas = 0;
    let valorAberto = 0;

    for (const p of pipelines) {
      const idx = mapaIndiceStage.get(p.stage_id);
      const nome = mapaNomeStage.get(p.stage_id) ?? "";
      const v = p.valor_oportunidade ?? 0;
      if (idx !== undefined) {
        funil[idx].atual += 1;
        funil[idx].valorAtual += v;
      }
      if (ehStage(nome, "GANHO")) ganhos += 1;
      else if (ehStage(nome, "PERDIDO")) perdidos += 1;
      else if (ehStage(nome, "OPORTUNIDADE")) oportunidadesAbertas += 1;

      if (!ehStage(nome, "PERDIDO")) {
        valorPipeline += v;
        if (!ehStage(nome, "GANHO")) valorAberto += v;
      }
    }

    const winRate =
      ganhos + perdidos > 0 ? (ganhos / (ganhos + perdidos)) * 100 : 0;

    // ---- Aderidos por estágio no período (via histórico de mudanças) ----

    const aderidosPeriodo = new Map<string, number>();
    for (const s of listaStages) aderidosPeriodo.set(s.id, 0);

    // TOT por estágio (tempo médio em dias) — calcula a partir do histórico.
    // Monta sessões por (company, stage): entra quando vira destino; sai quando
    // o lead passa a outro estágio.
    const sessao = new Map<string, { stage_id: string; desde: number }>(); // company -> sessão atual
    const acumuladorTempo = new Map<string, { soma: number; n: number }>();
    const jaAderiuPeriodo = new Map<string, Set<string>>();

    for (const s of listaStages) jaAderiuPeriodo.set(s.id, new Set<string>());

    for (const ev of eventos) {
      const ts = new Date(ev.criado_em).getTime();
      // Aplica filtro de período para aderidos/TOT/produção no período.
      const noPeriodo =
        (!de || ev.criado_em >= de) && (!ate || ev.criado_em <= ate);

      if (ev.tipo_evento === "mudanca_estagio") {
        // Fecha a sessão anterior
        const anterior = sessao.get(ev.company_id);
        if (anterior) {
          const durDias = (ts - anterior.desde) / 86400000;
          const acc = acumuladorTempo.get(anterior.stage_id) ?? { soma: 0, n: 0 };
          acc.soma += durDias;
          acc.n += 1;
          acumuladorTempo.set(anterior.stage_id, acc);
        }
        // Abre nova sessão no destino
        if (ev.stage_destino_id) {
          sessao.set(ev.company_id, {
            stage_id: ev.stage_destino_id,
            desde: ts,
          });
        } else {
          sessao.delete(ev.company_id);
        }
        if (noPeriodo && ev.stage_destino_id) {
          const set = jaAderiuPeriodo.get(ev.stage_destino_id)!;
          if (!set.has(ev.company_id)) {
            set.add(ev.company_id);
            aderidosPeriodo.set(
              ev.stage_destino_id,
              (aderidosPeriodo.get(ev.stage_destino_id) ?? 0) + 1
            );
          }
        }
      } else if (
        (ev.tipo_evento === "lead_adicionado" ||
          ev.tipo_evento === "atividade") &&
        noPeriodo
      ) {
        // Comportamento auxiliar (não usado no TOT).
      }
    }

    // Leads que entraram no pipeline (lead_adicionado) no período, por estágio
    // inicial, para "aderidos" quando não há mudanca_estagio associada.
    for (const ev of eventos) {
      if (ev.tipo_evento === "lead_adicionado") {
        const noPeriodo =
          (!de || ev.criado_em >= de) && (!ate || ev.criado_em <= ate);
        if (noPeriodo && ev.stage_destino_id) {
          const set = jaAderiuPeriodo.get(ev.stage_destino_id)!;
          if (!set.has(ev.company_id)) {
            set.add(ev.company_id);
            aderidosPeriodo.set(
              ev.stage_destino_id,
              (aderidosPeriodo.get(ev.stage_destino_id) ?? 0) + 1
            );
          }
        }
        // Configura sessão inicial para TOT, se ainda não existe.
        if (!sessao.has(ev.company_id) && ev.stage_destino_id) {
          sessao.set(ev.company_id, {
            stage_id: ev.stage_destino_id,
            desde: new Date(ev.criado_em).getTime(),
          });
        }
      }
    }

    const totDias = listaStages.map((s) => {
      const acc = acumuladorTempo.get(s.id);
      return { nome: s.nome, dias: acc && acc.n > 0 ? acc.soma / acc.n : 0 };
    });

    // ---- Série temporal ----
    // Agrupa adicionados ao pipeline por bucket (dia/mês) dentro do período.
    const nBuckets = dias ? Number(dias) : 30;
    const serie = agruparSerie(eventos, pipelines, nBuckets, de, ate);

    // ---- Resultado por produto ----
    const porProduto = new Map<
      string,
      { total: number; valor: number; ganhos: number; perdidos: number }
    >();
    for (const p of pipelines) {
      const prod = p.produto?.trim() || "(sem produto)";
      const e = porProduto.get(prod) ?? { total: 0, valor: 0, ganhos: 0, perdidos: 0 };
      e.total += 1;
      e.valor += p.valor_oportunidade ?? 0;
      const nome = mapaNomeStage.get(p.stage_id) ?? "";
      if (ehStage(nome, "GANHO")) e.ganhos += 1;
      else if (ehStage(nome, "PERDIDO")) e.perdidos += 1;
      porProduto.set(prod, e);
    }
    const produtos = Array.from(porProduto.entries()).map(([nome, v]) => ({
      produto: nome,
      ...v,
    }));

    // ---- Atividade por vendedor ----
    const atividades = agregarAtividade(
      eventos,
      empresas,
      contatos,
      pipelines
    );

    // Resolve nomes/emails dos vendedores (perfil + membros da org).
    const idsAtividade = atividades
      .map((a) => a.usuario_id)
      .filter(Boolean) as string[];
    const mapaNome = new Map<string, { nome: string | null; email: string | null }>();
    if (idsAtividade.length > 0) {
      const [{ data: perfis }, { data: membros }] = await Promise.all([
        supabase
          .from("perfil")
          .select("usuario_id, nome_usuario")
          .in("usuario_id", idsAtividade),
        supabase
          .from("organizacao_membros")
          .select("usuario_id, email_convite")
          .eq("organizacao_id", orgId)
          .in("usuario_id", idsAtividade),
      ]);
      const mapaEmail = new Map<string, string | null>();
      for (const m of (membros ?? []) as Array<{ usuario_id: string; email_convite: string | null }>) {
        mapaEmail.set(m.usuario_id, m.email_convite);
      }
      for (const p of (perfis ?? []) as Array<{ usuario_id: string; nome_usuario: string | null }>) {
        mapaNome.set(p.usuario_id, {
          nome: p.nome_usuario,
          email: mapaEmail.get(p.usuario_id) ?? null,
        });
      }
      for (const a of atividades) {
        const info = mapaNome.get(a.usuario_id) ?? { nome: null, email: null };
        (a as unknown as { nome: string | null }).nome = info.nome;
        (a as unknown as { email: string | null }).email = info.email;
      }
    }

    // ---- Geração: empresas por origem ----
    const origemMap = new Map<string, number>();
    let empresasPeriodo = 0;
    for (const e of empresas) {
      const noPeriodo = (!de || e.criado_em >= de) && (!ate || e.criado_em <= ate);
      if (noPeriodo) empresasPeriodo += 1;
      const o = e.origem?.trim() || "manual";
      origemMap.set(o, (origemMap.get(o) ?? 0) + 1);
    }
    const empresasPorOrigem = Array.from(origemMap.entries()).map(
      ([origem, total]) => ({ origem, total })
    );

    const contatosPeriodo = contatos.filter(
      (c) => (!de || c.criado_em >= de) && (!ate || c.criado_em <= ate)
    ).length;
    const listasPeriodo = listas.filter(
      (l) => (!de || l.criado_em >= de) && (!ate || l.criado_em <= ate)
    ).length;
    const adicionadosPeriodo = eventos.filter(
      (ev) =>
        ev.tipo_evento === "lead_adicionado" &&
        (!de || ev.criado_em >= de) &&
        (!ate || ev.criado_em <= ate)
    ).length;

    return NextResponse.json({
      resumo: {
        empresas: empresas.length,
        contatos: contatos.length,
        listas: listas.length,
        leadsPipeline: pipelines.length,
        oportunidadesAbertas,
        ganhos,
        perdidos,
        winRate,
        valorPipeline,
        valorAberto,
        empresasPeriodo,
        contatosPeriodo,
        listasPeriodo,
        adicionadosPeriodo,
      },
      funil: funil.map((f, i) => ({
        ...f,
        aderidosPeriodo: aderidosPeriodo.get(f.id) ?? 0,
        totDias: totDias[i]?.dias ?? 0,
      })),
      serie,
      produtos,
      atividade: atividades,
      geracao: { empresasPorOrigem },
    });
  } catch (erro) {
    console.error("Erro nas métricas do painel:", erro);
    return NextResponse.json(
      { erro: "Não conseguimos carregar o painel de métricas." },
      { status: 500 }
    );
  }
}

function agruparSerie(
  eventos: Array<{
    company_id: string;
    tipo_evento: string;
    dados: Record<string, unknown>;
    stage_origem_id: string | null;
    stage_destino_id: string | null;
    usuario_id: string | null;
    criado_em: string;
  }>,
  pipelines: Array<{
    stage_id: string;
    responsavel_id: string | null;
    valor_oportunidade: number | null;
    produto: string | null;
    criado_em: string;
  }>,
  nBuckets: number,
  de?: string,
  ate?: string
) {
  // Usa buckets mensais (últimos N meses) por simplicidade.
  const meses = Math.max(1, Math.min(nBuckets, 12));
  const agora = ate ? new Date(ate).getTime() : Date.now();
  const buckets = Array.from({ length: meses }, (_, i) => {
    const d = new Date(agora);
    d.setMonth(d.getMonth() - (meses - 1 - i), 1);
    d.setHours(0, 0, 0, 0);
    return {
      rotulo: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      chave: `${d.getFullYear()}-${d.getMonth()}`,
      adicionados: 0,
      empresas: 0,
    };
  });
  const mapaBucket = new Map<string, number>();
  buckets.forEach((b, i) => mapaBucket.set(b.chave, i));

  const chaveDe = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };

  for (const ev of eventos) {
    if (ev.tipo_evento !== "lead_adicionado") continue;
    const idx = mapaBucket.get(chaveDe(ev.criado_em));
    if (idx !== undefined) buckets[idx].adicionados += 1;
  }
  for (const p of pipelines) {
    const idx = mapaBucket.get(chaveDe(p.criado_em));
    if (idx !== undefined) buckets[idx].empresas += 1;
  }
  return buckets;
}

function agregarAtividade(
  eventos: Array<{
    company_id: string;
    tipo_evento: string;
    dados: Record<string, unknown>;
    stage_origem_id: string | null;
    stage_destino_id: string | null;
    usuario_id: string | null;
    criado_em: string;
  }>,
  empresas: Array<{ usuario_id: string; origem: string | null; criado_em: string }>,
  contatos: Array<{ usuario_id: string; criado_em: string }>,
  pipelines: Array<{
    stage_id: string;
    responsavel_id: string | null;
    valor_oportunidade: number | null;
    produto: string | null;
    criado_em: string;
  }>
) {
  const mapa = new Map<
    string,
    {
      usuario_id: string;
      atividades: number;
      emails: number;
      telefones: number;
      reunioes: number;
      cadencias: number;
      observacoes: number;
      empresas: number;
      contatos: number;
      leads: number;
    }
  >();
  const get = (id: string) => {
    if (!mapa.has(id)) {
      mapa.set(id, {
        usuario_id: id,
        atividades: 0,
        emails: 0,
        telefones: 0,
        reunioes: 0,
        cadencias: 0,
        observacoes: 0,
        empresas: 0,
        contatos: 0,
        leads: 0,
      });
    }
    return mapa.get(id)!;
  };

  for (const ev of eventos) {
    if (!ev.usuario_id) continue;
    const m = get(ev.usuario_id);
    const tipo = texto(ev.dados?.tipo_atividade);
    if (ev.tipo_evento === "atividade") {
      m.atividades += 1;
      if (tipo === "email") m.emails += 1;
      else if (tipo === "telefone" || tipo === "whatsapp") m.telefones += 1;
      else if (tipo === "reuniao") m.reunioes += 1;
      else m.observacoes += 1;
    } else if (ev.tipo_evento === "cadencia_iniciada") {
      m.cadencias += 1;
    } else if (
      ev.tipo_evento === "lead_adicionado" ||
      ev.tipo_evento === "mudanca_estagio" ||
      ev.tipo_evento === "responsavel_definido" ||
      ev.tipo_evento === "oportunidade_atualizada"
    ) {
      m.atividades += 1;
    }
  }
  for (const e of empresas) {
    if (e.usuario_id) get(e.usuario_id).empresas += 1;
  }
  for (const c of contatos) {
    if (c.usuario_id) get(c.usuario_id).contatos += 1;
  }
  for (const p of pipelines) {
    if (p.responsavel_id) get(p.responsavel_id).leads += 1;
  }

  return Array.from(mapa.values()).sort((a, b) => b.atividades - a.atividades);
}
