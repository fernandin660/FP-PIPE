import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { LIMITES_MENSAIS, limitesEfetivos } from "../../../lib/avisos";

export async function GET() {
  const supabase = await criarClienteSupabaseServidor();

  if (!supabase) {
    return NextResponse.json(
      { erro: "Autenticação não configurada." },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emailDono = (
    process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br"
  ).toLowerCase();

  if (!user || (user.email ?? "").toLowerCase() !== emailDono) {
    return NextResponse.json(
      { erro: "Acesso restrito ao dono do produto." },
      { status: 403 }
    );
  }

  const admin = criarClienteSupabaseAdmin();

  if (!admin) {
    return NextResponse.json(
      { erro: "Chave de serviço não configurada." },
      { status: 503 }
    );
  }

  const mes = new Date().toISOString().slice(0, 7);

  const { data: usoApis } = await admin
    .from("uso_apis")
    .select("api, chamadas")
    .eq("mes", mes);

  const mapaUso = new Map<string, number>(
    (usoApis ?? []).map((u) => [u.api, u.chamadas])
  );

  const efetivos = await limitesEfetivos();

  const { data: ajustes } = await admin
    .from("limites_apis")
    .select("api");
  const ajustados = new Set((ajustes ?? []).map((a) => a.api));

  const apis = Object.keys(LIMITES_MENSAIS).map((api) => ({
    api,
    chamadas: mapaUso.get(api) ?? 0,
    limite: efetivos[api] ?? LIMITES_MENSAIS[api],
    ajustado: ajustados.has(api),
  }));

  const { data: listaUsuarios } = await admin.auth.admin.listUsers({
    perPage: 500,
  });

  const mapaEmails = new Map<string, string>(
    (listaUsuarios?.users ?? []).map((u) => [
      u.id,
      u.email ?? u.id.slice(0, 8),
    ])
  );

  const fontesDeMoeda = [
    { chave: "listas", nome: "🧭 Créditos de listas", tabela: "creditos" },
    {
      chave: "buscador",
      nome: "🔎 Créditos de buscador",
      tabela: "creditos_contatos",
    },
    {
      chave: "abordagens",
      nome: "✍️ Créditos de abordagem (IA)",
      tabela: "creditos_ia",
    },
  ];

  const moedas = [];

  for (const fonte of fontesDeMoeda) {
    const { data: linhas } = await admin
      .from(fonte.tabela)
      .select("saldo, usuario_id");

    const usuarios = (linhas ?? [])
      .filter((l) => (l.saldo ?? 0) > 0)
      .map((l) => ({
        email: mapaEmails.get(l.usuario_id) ?? "usuário",
        saldo: l.saldo ?? 0,
      }))
      .sort((a, b) => b.saldo - a.saldo);

    moedas.push({
      chave: fonte.chave,
      nome: fonte.nome,
      total: usuarios.reduce((soma, u) => soma + u.saldo, 0),
      usuarios,
    });
  }

  // Moeda de telefone: saldo atual por org (rows não têm usuario_id —
  // rotulamos pelo dono da organização via assinaturas).
  const { data: assinaturas } = await admin
    .from("assinaturas")
    .select("organizacao_id, usuario_id");
  const donoPorOrg = new Map<string, string>(
    (assinaturas ?? []).map((a) => [
      a.organizacao_id,
      mapaEmails.get(a.usuario_id) ?? "usuário",
    ])
  );
  const { data: linhasTelefone } = await admin
    .from("creditos_telefone")
    .select("organizacao_id, saldo");
  const usuariosTelefone = (linhasTelefone ?? [])
    .filter((l) => (l.saldo ?? 0) > 0)
    .map((l) => ({
      email: donoPorOrg.get(l.organizacao_id) ?? "usuário",
      saldo: l.saldo ?? 0,
    }))
    .sort((a, b) => b.saldo - a.saldo);

  moedas.push({
    chave: "telefone",
    nome: "📞 Créditos de telefone",
    total: usuariosTelefone.reduce((soma, u) => soma + u.saldo, 0),
    usuarios: usuariosTelefone,
  });

  // Medidor MillionPhones: consumo real da nossa conta MP a partir do
  // ledger de enriquecimento. Cada achado de número = 10 créditos MP
  // (política oficial da MillionPhones). Se a busca não retorna número,
  // estima-se que a MP não debita (pay-per-success).
  const { data: tentativasMp } = await admin
    .from("enriquecimento_attempts")
    .select(
      "organizacao_id, usuario_id, success, cache_hit, encontrado, erro_codigo, criado_em"
    )
    .eq("provider", "millionphones");

  const marcadorMes = new Date().toISOString().slice(0, 7);
  const CREDITOS_MP_POR_ACHADO = 10;
  // Cota global da nossa conta MP (créditos comprados). Sem env, assume 1000.
  const cotaMp =
    Number(process.env.MILLIONPHONES_COTA_MP) > 0
      ? Number(process.env.MILLIONPHONES_COTA_MP)
      : 1000;

  type AcumuladorMp = {
    chamadas: number;
    achados: number;
    semNumero: number;
    semCreditos: number;
    erros: number;
    cache: number;
    consumoMp: number;
  };
  const porOrgao = new Map<string, AcumuladorMp>();
  const porEmail = new Map<string, AcumuladorMp>();
  let consumoHistoricoMp = 0;

  const novoAcumulador = (): AcumuladorMp => ({
    chamadas: 0,
    achados: 0,
    semNumero: 0,
    semCreditos: 0,
    erros: 0,
    cache: 0,
    consumoMp: 0,
  });

  for (const t of tentativasMp ?? []) {
    // Consumo acumulado (estoque da conta MP não expira) para a % de cota.
    if (t.encontrado && t.success && !t.cache_hit) {
      consumoHistoricoMp += CREDITOS_MP_POR_ACHADO;
    }

    if (!t.criado_em || String(t.criado_em).slice(0, 7) !== marcadorMes) continue;

    const orgChave = t.organizacao_id ?? "sem-org";
    const emailChave = mapaEmails.get(t.usuario_id ?? "") ?? "usuário";
    const org = porOrgao.get(orgChave) ?? novoAcumulador();
    const email = porEmail.get(emailChave) ?? novoAcumulador();

    org.chamadas += 1;
    email.chamadas += 1;
    if (t.cache_hit) {
      org.cache += 1;
      email.cache += 1;
    } else if (t.encontrado && t.success) {
      org.achados += 1;
      email.achados += 1;
      org.consumoMp += CREDITOS_MP_POR_ACHADO;
      email.consumoMp += CREDITOS_MP_POR_ACHADO;
    } else if (t.erro_codigo === "sem_creditos" || t.erro_codigo === "sem_saldo") {
      org.semCreditos += 1;
      email.semCreditos += 1;
    } else if (t.success && !t.encontrado) {
      org.semNumero += 1;
      email.semNumero += 1;
    } else {
      org.erros += 1;
      email.erros += 1;
    }

    porOrgao.set(orgChave, org);
    porEmail.set(emailChave, email);
  }

  const mlpOrgaos = [...porOrgao.entries()].map(([organizacaoId, u]) => ({
    organizacaoId,
    ...u,
  })).sort((a, b) => b.consumoMp - a.consumoMp);
  const mlpUsuarios = [...porEmail.entries()].map(([email, u]) => ({
    email,
    ...u,
  })).sort((a, b) => b.consumoMp - a.consumoMp);

  return NextResponse.json({
    mes,
    apis,
    moedas,
    millionphones: {
      creditosPorAchado: CREDITOS_MP_POR_ACHADO,
      cotaMp,
      totalAchados: mlpOrgaos.reduce((soma, u) => soma + u.achados, 0),
      totalChamadas: mlpOrgaos.reduce((soma, u) => soma + u.chamadas, 0),
      totalConsumoMp: mlpOrgaos.reduce((soma, u) => soma + u.consumoMp, 0),
      totalConsumoHistoricoMp: consumoHistoricoMp,
      percentualConsumo:
        cotaMp > 0 ? Math.round((consumoHistoricoMp / cotaMp) * 100) : 0,
      orgaos: mlpOrgaos,
      usuarios: mlpUsuarios,
    },
  });
}
