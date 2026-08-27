import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { exigirAcesso } from "../../../lib/gate";
import { registrarUso } from "../../../lib/avisos";
import { buscarContatoCompleto } from "../../../lib/enriquecimento";
import { exigirRateLimit } from "../../../lib/rate-limit";

const REGEX_LINKEDIN =
  /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?$/i;

function normalizarLinkedin(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

async function localizarContatoExistente(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServidor>>>,
  usuarioId: string,
  linkedinNormalizado: string
) {
  const { data } = await supabase
    .from("contatos")
    .select("id, company_id")
    .eq("usuario_id", usuarioId)
    .eq("linkedin_url", linkedinNormalizado)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

type CorpoBusca = {
  linkedinUrl?: unknown;
  empresa?: unknown;
  nome?: unknown;
  tipo?: unknown;
};

type CorpoAtribuicao = {
  contatoId?: unknown;
  companyId?: unknown;
};

export async function PUT(requisicao: Request) {
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

  if (!user) {
    return NextResponse.json({ erro: "Faça login novamente." }, { status: 401 });
  }

  let corpo: CorpoAtribuicao;
  try {
    corpo = (await requisicao.json()) as CorpoAtribuicao;
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const contatoId = String(corpo.contatoId ?? "");
  const companyId = String(corpo.companyId ?? "");

  if (!contatoId || !companyId) {
    return NextResponse.json({ erro: "Dados incompletos." }, { status: 400 });
  }

  const { data: contato } = await supabase
    .from("contatos")
    .select("id, nome, cargo, email, linkedin_url")
    .eq("id", contatoId)
    .eq("usuario_id", user.id)
    .single();

  const { data: empresa } = await supabase
    .from("companies")
    .select("id, campeao_email")
    .eq("id", companyId)
    .single();

  if (!contato || !empresa) {
    return NextResponse.json(
      { erro: "Contato ou lead não encontrado." },
      { status: 404 }
    );
  }

  await supabase
    .from("contatos")
    .update({ company_id: companyId })
    .eq("id", contatoId);

  if (!empresa.campeao_email) {
    await supabase
      .from("companies")
      .update({
        campeao_nome: contato.nome,
        campeao_cargo: contato.cargo,
        campeao_email: contato.email,
        campeao_linkedin: contato.linkedin_url,
      })
      .eq("id", companyId);
  }

  return NextResponse.json({ ok: true });
}

export async function POST(requisicao: Request) {
  const bloqueado = await exigirRateLimit(requisicao, "buscar-contato", 10, 60);
  if (bloqueado) return bloqueado;

  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, usuarioId, orgId, acesso } = gate.ctx!;

  if (!acesso.def.temBuscador) {
    return NextResponse.json(
      {
        erro:
          "O plano Silver não inclui o Buscador de contatos. Faça upgrade para Gold ou Platinum em /planos.",
        motivo: "sem_buscador",
      },
      { status: 403 }
    );
  }

  let corpo: CorpoBusca;
  try {
    corpo = (await requisicao.json()) as CorpoBusca;
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const linkedinInput = String(corpo.linkedinUrl ?? "").trim();
  const empresaInput = String(corpo.empresa ?? "").trim();
  let nomeInput = String(corpo.nome ?? "").trim();

  const linkedinNormalizado = linkedinInput
    ? normalizarLinkedin(linkedinInput)
    : "";

  const temLinkedin = !!linkedinNormalizado && REGEX_LINKEDIN.test(linkedinNormalizado);
  const temEmpresa = !!empresaInput;

  // Extrair nome da pessoa da URL do LinkedIn se não foi informado
  if (!nomeInput && temLinkedin) {
    const partes = linkedinNormalizado.split("/").filter(Boolean);
    const slug = partes[partes.length - 1] ?? "";
    nomeInput = slug
      .replace(/-\d+$/, "")
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }

  if (!temLinkedin && !temEmpresa) {
    return NextResponse.json(
      { erro: "Informe a URL do LinkedIn ou o nome da empresa." },
      { status: 400 }
    );
  }

  const tipo = ["email", "telefone", "both"].includes(String(corpo.tipo))
    ? String(corpo.tipo)
    : "both";

  const precisaTelefone = tipo === "telefone" || tipo === "both";
  const custoTelefone = 10; // cada telefone verificado custa 10 créditos de telefone

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço de créditos indisponível." },
      { status: 503 }
    );
  }

  const { data: perfilDepto } = await supabase
    .from("perfil")
    .select("departamento_uso")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  const deptoAtual =
    (perfilDepto?.departamento_uso as string | null)?.trim() || "";

  // Cache só funciona se tiver LinkedIn URL
  if (temLinkedin) {
    const { data: cacheHit } = await admin
      .from("emails_cache")
      .select("email, nome, cargo, empresa")
      .eq("linkedin_url", linkedinNormalizado)
      .eq("departamento_uso", deptoAtual)
      .maybeSingle();

    if (cacheHit?.email) {
      let saldoTelefoneCache = 0;
      if (precisaTelefone) {
        const { data: telCache } = await supabase
          .from("creditos_telefone")
          .select("saldo")
          .eq("organizacao_id", orgId)
          .maybeSingle();
        saldoTelefoneCache = telCache?.saldo ?? 0;

        if (saldoTelefoneCache < custoTelefone) {
          return NextResponse.json(
            { erro: "Créditos de telefone insuficientes. Faça upgrade para obter mais." },
            { status: 402 }
          );
        }

        await admin
          .from("creditos_telefone")
          .update({ saldo: saldoTelefoneCache - custoTelefone })
          .eq("organizacao_id", orgId);
        saldoTelefoneCache -= custoTelefone;
      }

      const contatoCache = {
        linkedin_url: linkedinNormalizado,
        nome: cacheHit.nome,
        cargo: cacheHit.cargo,
        empresa: cacheHit.empresa,
        email: cacheHit.email,
      };

      const existenteCache = await localizarContatoExistente(
        supabase,
        usuarioId,
        linkedinNormalizado
      );

      let salvoCache = null;

      if (existenteCache) {
        const { data } = await supabase
          .from("contatos")
          .update({
            email: contatoCache.email,
            nome: contatoCache.nome,
            cargo: contatoCache.cargo,
            empresa: contatoCache.empresa,
          })
          .eq("id", existenteCache.id)
          .select()
          .single();
        salvoCache = data;
      } else {
        const { data } = await supabase
          .from("contatos")
          .insert({
            ...contatoCache,
            usuario_id: usuarioId,
            emails: [contatoCache.email],
            telefones: [],
          })
          .select()
          .single();
        salvoCache = data;
      }

      let telefones: string[] = [];
      let fontesTelefone: string[] = [];

      if (tipo === "telefone" || tipo === "both") {
        const enrich = await buscarContatoCompleto(
          linkedinNormalizado,
          contatoCache.empresa ?? "",
          contatoCache.nome ?? ""
        );
        telefones = enrich.telefones;
        fontesTelefone = enrich.fontesTelefone;
      }

      if (telefones.length > 0 && salvoCache?.id) {
        await supabase
          .from("contatos")
          .update({ telefones })
          .eq("id", salvoCache.id);
      }

      return NextResponse.json({
        encontrado: true,
        doCache: true,
        contato:
          salvoCache ?? {
            ...contatoCache,
            id: existenteCache?.id,
            company_id: existenteCache?.company_id ?? null,
            telefones,
          },
        emails: tipo !== "telefone" ? [contatoCache.email] : [],
        telefones,
        fontesTelefone,
        saldoTelefones: saldoTelefoneCache,
      });
    }
  }

  // Busca completa — com ou sem LinkedIn
  let saldoTelefone = 0;
  if (precisaTelefone) {
    const { data: telAtual } = await supabase
      .from("creditos_telefone")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();
    saldoTelefone = telAtual?.saldo ?? 0;

    if (saldoTelefone < custoTelefone) {
      return NextResponse.json(
        { erro: "Créditos de telefone insuficientes. Faça upgrade para obter mais." },
        { status: 402 }
      );
    }
  }

  // Busca: LinkedIn URL + empresa + nome (o que tiver)
  const resultado = await buscarContatoCompleto(
    linkedinNormalizado,
    empresaInput,
    nomeInput
  );

  let novoSaldoTelefone = saldoTelefone;
  if (precisaTelefone) {
    novoSaldoTelefone = Math.max(0, saldoTelefone - custoTelefone);
    await admin
      .from("creditos_telefone")
      .update({ saldo: novoSaldoTelefone })
      .eq("organizacao_id", orgId);

    void registrarUso("buscador_contatos");
  }

  const contato = {
    linkedin_url: linkedinNormalizado || null,
    nome: nomeInput || null,
    cargo: null as string | null,
    empresa: empresaInput || null,
    email: resultado.emails[0] ?? null,
  };

  // Salva no cache global (só se tiver LinkedIn)
  if (admin && temLinkedin) {
    await admin.from("emails_cache").upsert(
      {
        linkedin_url: linkedinNormalizado,
        email: contato.email,
        nome: contato.nome,
        cargo: contato.cargo,
        empresa: contato.empresa,
        departamento_uso: deptoAtual,
      },
      { onConflict: "linkedin_url" }
    );
  }

  // Salva contato no banco
  let salvo = null;

  if (temLinkedin) {
    const existente = await localizarContatoExistente(
      supabase,
      usuarioId,
      linkedinNormalizado
    );

    if (existente) {
      const { data } = await supabase
        .from("contatos")
        .update({
          email: contato.email,
          nome: contato.nome,
          cargo: contato.cargo,
          empresa: contato.empresa,
          telefones: resultado.telefones.length > 0 ? resultado.telefones : undefined,
        })
        .eq("id", existente.id)
        .select()
        .single();
      salvo = data;
    } else {
      const { data } = await supabase
        .from("contatos")
        .insert({
          ...contato,
          usuario_id: usuarioId,
          emails: contato.email ? [contato.email] : [],
          telefones: resultado.telefones,
        })
        .select()
        .single();
      salvo = data;
    }
  }

  return NextResponse.json({
    encontrado: Boolean(
      resultado.emails.length ||
      resultado.telefones.length ||
      contato.nome ||
      contato.email
    ),
    doCache: false,
    contato: salvo ?? {
      ...contato,
      id: null,
      company_id: null,
      telefones: resultado.telefones,
    },
    emails: resultado.emails,
    telefones: resultado.telefones,
    fontesEmail: resultado.fontesEmail,
    fontesTelefone: resultado.fontesTelefone,
    saldoTelefones: novoSaldoTelefone,
  });
}
