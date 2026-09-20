import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { exigirAcesso } from "../../../lib/gate";
import { registrarUso } from "../../../lib/avisos";
import { buscarContatoCompleto, buscarDadosCnpj } from "../../../lib/enriquecimento";
import { exigirRateLimit } from "../../../lib/rate-limit";

const REGEX_LINKEDIN =
  /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?$/i;

function normalizarLinkedin(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

async function localizarContatoExistente(
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServidor>>>,
  orgId: string,
  linkedinNormalizado: string
) {
  const { data } = await supabase
    .from("contatos")
    .select("id, company_id, telefones")
    .eq("organizacao_id", orgId)
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
  cnpj?: unknown;
  tipo?: unknown;
};

async function salvarCacheEmail(
  admin: NonNullable<ReturnType<typeof criarClienteSupabaseAdmin>>,
  linkedinUrl: string,
  depto: string,
  email: string,
  nome: string,
  cargo: string,
  empresa: string
) {
  if (!admin) return;
  await admin.from("emails_cache").upsert(
    {
      linkedin_url: linkedinUrl,
      email,
      nome,
      cargo,
      empresa,
      departamento_uso: depto,
    },
    { onConflict: "linkedin_url" }
  );
}

async function upsertContato(
  admin: NonNullable<ReturnType<typeof criarClienteSupabaseAdmin>>,
  supabase: NonNullable<Awaited<ReturnType<typeof criarClienteSupabaseServidor>>>,
  orgId: string,
  usuarioId: string,
  linkedinUrl: string | null,
  contato: {
    email: string | null;
    nome: string | null;
    cargo: string | null;
    empresa: string | null;
    telefones: string[];
  },
  existingId: string | null
) {
  if (!admin) return null;

  const base = {
    linkedin_url: linkedinUrl,
    email: contato.email,
    nome: contato.nome,
    cargo: contato.cargo,
    empresa: contato.empresa,
    telefones: contato.telefones,
  };

  if (existingId) {
    const { data } = await admin
      .from("contatos")
      .update({
        email: contato.email,
        nome: contato.nome,
        cargo: contato.cargo,
        empresa: contato.empresa,
        telefones: contato.telefones,
      })
      .eq("id", existingId)
      .select()
      .single();
    return data;
  } else {
    const { data } = await admin
      .from("contatos")
      .insert({
        ...base,
        usuario_id: usuarioId,
        organizacao_id: orgId,
        emails: contato.email ? [contato.email] : [],
        telefones: contato.telefones,
      })
      .select()
      .single();
    return data;
  }
}

async function atualizarTelefonesContato(
  admin: NonNullable<ReturnType<typeof criarClienteSupabaseAdmin>>,
  contatoId: string,
  telefones: string[]
) {
  if (!admin || !contatoId || telefones.length === 0) return;
  await admin.from("contatos").update({ telefones }).eq("id", contatoId);
}

function pontuarIcp(termosIcp: string, cargo: string | null, empresa: string | null) {
  if (!termosIcp) return { score: null, motivos: [] as string[] };
  const texto = `${cargo ?? ""} ${empresa ?? ""}`.toLowerCase();
  const termos = termosIcp.toLowerCase().split(/[^a-z0-9À-ÿ]+/i).filter((t) => t.length >= 4);
  const encontrados = [...new Set(termos.filter((termo) => texto.includes(termo)))];
  const score = Math.min(100, 35 + encontrados.length * 15 + (cargo ? 20 : 0));
  return { score, motivos: encontrados.slice(0, 4) };
}

export async function POST(request: Request) {
  const bloqueado = await exigirRateLimit(request, "buscar-contato", 30, 60);
  if (bloqueado) return bloqueado;

  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, orgId, usuarioId, acesso } = gate.ctx!;

  let corpo: CorpoBusca;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const linkedinInput =
    typeof corpo.linkedinUrl === "string" ? corpo.linkedinUrl.trim() : "";
  const empresaInput = typeof corpo.empresa === "string" ? corpo.empresa.trim() : "";
  const nomeInput = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
  const cnpjInput = typeof corpo.cnpj === "string" ? corpo.cnpj.trim() : "";

  const temLinkedin = REGEX_LINKEDIN.test(linkedinInput);
  const linkedinNormalizado = temLinkedin ? normalizarLinkedin(linkedinInput) : "";
  const cnpjNormalizado = cnpjInput.replace(/\D/g, "");
  const temCnpj = cnpjNormalizado.length === 14;
  const temEmpresa = empresaInput.length > 0;
  const temNome = nomeInput.length > 0;

  const tipo = ["email", "telefone", "both"].includes(String(corpo.tipo))
    ? String(corpo.tipo)
    : "both";

  const precisaTelefone = tipo === "telefone" || tipo === "both";

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço de créditos indisponível." }, { status: 503 });
  }

  const { data: perfilDepto } = await supabase
    .from("perfil")
    .select("departamento_uso, area_atuacao, produtos_servicos, nichos")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  const deptoAtual = (perfilDepto?.departamento_uso as string | null)?.trim() || "";

  const termosIcp = [
    perfilDepto?.area_atuacao,
    perfilDepto?.produtos_servicos,
    ...(Array.isArray(perfilDepto?.nichos) ? perfilDepto.nichos : []),
  ]
    .filter((termo): termo is string => typeof termo === "string" && !!termo.trim())
    .join(" ");

  function pontuarIcpLocal(cargo: string | null, empresa: string | null) {
    if (!termosIcp) return { score: null, motivos: [] as string[] };
    const texto = `${cargo ?? ""} ${empresa ?? ""}`.toLowerCase();
    const termos = termosIcp.toLowerCase().split(/[^a-z0-9À-ÿ]+/i).filter((t) => t.length >= 4);
    const encontrados = [...new Set(termos.filter((termo) => texto.includes(termo)))];
    const score = Math.min(100, 35 + encontrados.length * 15 + (cargo ? 20 : 0));
    return { score, motivos: encontrados.slice(0, 4) };
  }

  // Cache só funciona se tiver LinkedIn URL
  if (temLinkedin) {
    const { data: cacheHit } = await admin
      .from("emails_cache")
      .select("email, nome, cargo, empresa, telefones")
      .eq("linkedin_url", linkedinNormalizado)
      .eq("departamento_uso", deptoAtual)
      .maybeSingle();

    if (cacheHit?.email) {
      let saldoTelefoneCacheHit = 0;
      if (precisaTelefone) {
        const { data: telCache } = await supabase
          .from("creditos_telefone")
          .select("saldo")
          .eq("organizacao_id", orgId)
          .maybeSingle();
        saldoTelefoneCacheHit = telCache?.saldo ?? 0;
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
        orgId,
        linkedinNormalizado
      );

      // Se cache tem telefones E não precisa buscar telefone, retorna direto
      if (!precisaTelefone || (cacheHit.telefones && cacheHit.telefones.length > 0)) {
        const salvoCache = await upsertContato(admin, supabase, orgId, usuarioId, linkedinNormalizado, {
          email: cacheHit.email,
          nome: cacheHit.nome,
          cargo: cacheHit.cargo,
          empresa: cacheHit.empresa,
          telefones: cacheHit.telefones ?? [],
        }, existenteCache?.id ?? null);

        return NextResponse.json({
          encontrado: true,
          doCache: true,
          contato: salvoCache ?? { ...contatoCache, telefones: cacheHit.telefones ?? [] },
          emails: tipo !== "telefone" ? [cacheHit.email] : [],
          telefones: cacheHit.telefones ?? [],
          fontesTelefone: ["cache"],
          saldoTelefones: 0,
          matchScore: pontuarIcpLocal(contatoCache.cargo, contatoCache.empresa).score,
          matchMotivos: pontuarIcpLocal(contatoCache.cargo, contatoCache.empresa).motivos,
        });
      }

      // Cache hit mas precisa buscar telefone (cache não tem telefone)
      let telefones: string[] = [];
      let fontesTelefone: string[] = [];

      // Busca telefone via engine (não reserva crédito aqui - engine faz isso)
      const enrich = await buscarContatoCompleto(
        linkedinNormalizado,
        contatoCache.empresa ?? "",
        contatoCache.nome ?? "",
        undefined,
        undefined,
        undefined,
        { organizacao_id: orgId, usuario_id: usuarioId }
      );
      telefones = enrich.telefones;
      fontesTelefone = enrich.fontesTelefone;

      // Atualiza contatos com telefones encontrados
      const salvoCache = await upsertContato(admin, supabase, orgId, usuarioId, linkedinNormalizado, {
        email: cacheHit.email,
        nome: cacheHit.nome,
        cargo: cacheHit.cargo,
        empresa: cacheHit.empresa,
        telefones,
      }, existenteCache?.id ?? null);

      // Atualiza cache de email com telefones
      await salvarCacheEmail(admin, linkedinNormalizado, deptoAtual, cacheHit.email, cacheHit.nome, cacheHit.cargo, cacheHit.empresa);

      if (enrich.fontesTelefone.includes("millionphones")) {
        void registrarUso("buscador_contatos");
      }

      let saldoTelefoneCacheFull = 0;
      if (precisaTelefone) {
        const { data: telCachePos } = await supabase
          .from("creditos_telefone")
          .select("saldo")
          .eq("organizacao_id", orgId)
          .maybeSingle();
        saldoTelefoneCacheFull = telCachePos?.saldo ?? 0;
      }

      return NextResponse.json({
        encontrado: true,
        doCache: true,
        contato: salvoCache ?? { ...cacheHit, telefones },
        emails: tipo !== "telefone" ? [cacheHit.email] : [],
        telefones,
        fontesTelefone,
        saldoTelefones: saldoTelefoneCacheFull,
        matchScore: pontuarIcpLocal(contatoCache.cargo, contatoCache.empresa).score,
        matchMotivos: pontuarIcpLocal(contatoCache.cargo, contatoCache.empresa).motivos,
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
  }

  // Busca completa (fora do cache) roda providers pagos
  // (Google/Maps/Serper/Casados Dados): consome 1 crédito de busca
  // (moeda creditos_contatos, creditada com as buscas do plano).
  // O motor de enriquecimento (runProvider) já faz a reserva/débito atômico.
  // Não precisamos chamar reservarBuscaContato aqui.

  // Busca: LinkedIn URL + empresa + CNPJ + nome (o que tiver)
  const resultado = await buscarContatoCompleto(
    linkedinNormalizado,
    empresaInput,
    nomeInput,
    undefined,
    undefined,
    temCnpj ? cnpjNormalizado : undefined,
    { organizacao_id: orgId, usuario_id: usuarioId }
  );

  const existenteAntes = temLinkedin
    ? await localizarContatoExistente(supabase, orgId, linkedinNormalizado)
    : null;

  let novoSaldoTelefone = 0;
  const veioDoMillionPhones = resultado.fontesTelefone.includes("millionphones");
  if (veioDoMillionPhones) {
    void registrarUso("buscador_contatos");
  }

  // Re-lê saldo de telefone após enriquecimento (o engine já debitou se usou MillionPhones)
  if (precisaTelefone) {
    const { data: telPos } = await supabase
      .from("creditos_telefone")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();
    novoSaldoTelefone = telPos?.saldo ?? 0;
  }

  const contato = {
    linkedin_url: linkedinNormalizado || null,
    nome: nomeInput || null,
    cargo: resultado.cargo ?? null,
    empresa: empresaInput || null,
    email: resultado.emails[0] ?? null,
  };

  // Salva no cache global (só se tiver LinkedIn)
  if (temLinkedin) {
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
    const existente = await localizarContatoExistente(supabase, orgId, linkedinNormalizado);

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
          linkedin_url: linkedinNormalizado,
          email: contato.email,
          nome: contato.nome,
          cargo: contato.cargo,
          empresa: contato.empresa,
          usuario_id: usuarioId,
          organizacao_id: orgId,
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
    matchScore: pontuarIcpLocal(contato.cargo, contato.empresa).score,
    matchMotivos: pontuarIcpLocal(contato.cargo, contato.empresa).motivos,
  });
}