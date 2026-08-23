import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";

const CHAVE_ANYMAIL = process.env.ANYMAIL_FINDER_API_KEY ?? "";

const REGEX_LINKEDIN =
  /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?$/i;

function normalizarLinkedin(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

// Reutiliza a linha existente do mesmo perfil para não duplicar contatos
// e preservar a atribuição anterior ao lead.
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

  // Preenche o campeão do lead só se ele ainda não tiver um.
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
  if (!CHAVE_ANYMAIL) {
    return NextResponse.json(
      { erro: "Integração de contatos ainda não configurada." },
      { status: 503 }
    );
  }

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

  let corpo: CorpoBusca;
  try {
    corpo = (await requisicao.json()) as CorpoBusca;
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const linkedinNormalizado = normalizarLinkedin(
    String(corpo.linkedinUrl ?? "").trim()
  );

  if (!REGEX_LINKEDIN.test(linkedinNormalizado)) {
    return NextResponse.json(
      { erro: "Cole uma URL válida de perfil do LinkedIn." },
      { status: 400 }
    );
  }

  // Cache global: perfil já buscado antes = não gasta crédito do provedor,
  // mas o usuário paga normalmente pela informação.
  const admin = criarClienteSupabaseAdmin();

  if (admin) {
    const { data: cacheHit } = await admin
      .from("emails_cache")
      .select("email, nome, cargo, empresa")
      .eq("linkedin_url", linkedinNormalizado)
      .maybeSingle();

    if (cacheHit?.email) {
      const { data: creditosCache } = await supabase
        .from("creditos_contatos")
        .select("saldo")
        .eq("usuario_id", user.id)
        .maybeSingle();

      let saldoCache = creditosCache?.saldo;

      if (saldoCache === null || saldoCache === undefined) {
        const { data: criada } = await supabase
          .from("creditos_contatos")
          .insert({ usuario_id: user.id, saldo: 5 })
          .select("saldo")
          .single();

        saldoCache = criada?.saldo ?? 0;
      }

      if ((saldoCache ?? 0) <= 0) {
        return NextResponse.json(
          { erro: "Você está sem créditos de contato." },
          { status: 402 }
        );
      }

      const novoSaldoCache = Math.max(0, (saldoCache ?? 0) - 1);

      await supabase
        .from("creditos_contatos")
        .update({ saldo: novoSaldoCache })
        .eq("usuario_id", user.id);

      const contatoCache = {
        linkedin_url: linkedinNormalizado,
        nome: cacheHit.nome,
        cargo: cacheHit.cargo,
        empresa: cacheHit.empresa,
        email: cacheHit.email,
      };

      const existenteCache = await localizarContatoExistente(
        supabase,
        user.id,
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
            usuario_id: user.id,
            emails: [contatoCache.email],
            telefones: [],
          })
          .select()
          .single();

        salvoCache = data;
      }

      return NextResponse.json({
        encontrado: true,
        doCache: true,
        contato:
          salvoCache ?? {
            ...contatoCache,
            id: existenteCache?.id,
            company_id: existenteCache?.company_id ?? null,
          },
        saldoContatos: novoSaldoCache,
      });
    }
  }

  // Créditos de contato: primeira busca cria a linha com saldo de boas-vindas.
  const { data: creditosAtuais } = await supabase
    .from("creditos_contatos")
    .select("saldo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  let saldo = creditosAtuais?.saldo;

  if (saldo === null || saldo === undefined) {
    const { data: criada, error: erroCriar } = await supabase
      .from("creditos_contatos")
      .insert({ usuario_id: user.id, saldo: 5 })
      .select("saldo")
      .single();

    if (erroCriar || !criada) {
      return NextResponse.json(
        { erro: "Não foi possível preparar seus créditos." },
        { status: 500 }
      );
    }
    saldo = criada.saldo;
  }

  if ((saldo ?? 0) <= 0) {
    return NextResponse.json(
      { erro: "Você está sem créditos de contato." },
      { status: 402 }
    );
  }

  const respostaAnymail = await fetch(
    "https://api.anymailfinder.com/v5.1/find-email/linkedin-url",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHAVE_ANYMAIL}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ linkedin_url: linkedinNormalizado }),
    }
  );

  const dados = (await respostaAnymail.json().catch(() => ({}))) as {
    email?: string;
    valid_email?: string | null;
    email_status?: string;
    full_name?: string;
    person_full_name?: string;
    job_title?: string;
    person_job_title?: string;
    company_name?: string;
    company?: string;
    person_company_name?: string;
    credits_charged?: number;
  };

  if (!respostaAnymail.ok) {
    return NextResponse.json(
      { erro: "O provedor não conseguiu processar essa busca agora." },
      { status: 502 }
    );
  }

  const emailVerificado = dados.valid_email || dados.email;

  if (!emailVerificado || dados.email_status !== "valid") {
    return NextResponse.json({
      encontrado: false,
      mensagem:
        "Nenhum e-mail verificado encontrado para esse perfil (você não foi cobrado).",
    });
  }

  const cobrado = typeof dados.credits_charged === "number" ? dados.credits_charged : 1;
  const novoSaldo = Math.max(0, (saldo ?? 0) - cobrado);

  await supabase
    .from("creditos_contatos")
    .update({ saldo: novoSaldo })
    .eq("usuario_id", user.id);

  const contato = {
    linkedin_url: linkedinNormalizado,
    nome: dados.person_full_name || dados.full_name || null,
    cargo: dados.person_job_title || dados.job_title || null,
    empresa:
      dados.person_company_name || dados.company_name || dados.company || null,
    email: emailVerificado,
  };

  // Guarda no cache global para futuras buscas do mesmo perfil.
  if (admin) {
    await admin.from("emails_cache").upsert(
      {
        linkedin_url: linkedinNormalizado,
        email: contato.email,
        nome: contato.nome,
        cargo: contato.cargo,
        empresa: contato.empresa,
      },
      { onConflict: "linkedin_url" }
    );
  }

  const existente = await localizarContatoExistente(
    supabase,
    user.id,
    linkedinNormalizado
  );

  let salvo = null;

  if (existente) {
    const { data } = await supabase
      .from("contatos")
      .update({
        email: contato.email,
        nome: contato.nome,
        cargo: contato.cargo,
        empresa: contato.empresa,
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
        usuario_id: user.id,
        emails: [contato.email],
        telefones: [],
      })
      .select()
      .single();

    salvo = data;
  }

  return NextResponse.json({
    encontrado: true,
    doCache: false,
    contato:
      salvo ?? {
        ...contato,
        id: existente?.id,
        company_id: existente?.company_id ?? null,
      },
    saldoContatos: novoSaldo,
  });
}
