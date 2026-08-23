import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";

const CHAVE_ANYMAIL = process.env.ANYMAIL_FINDER_API_KEY ?? "";

const REGEX_LINKEDIN =
  /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?$/i;

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

  const linkedinUrl = String(corpo.linkedinUrl ?? "").trim();

  if (!REGEX_LINKEDIN.test(linkedinUrl)) {
    return NextResponse.json(
      { erro: "Cole uma URL válida de perfil do LinkedIn." },
      { status: 400 }
    );
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
      body: JSON.stringify({ linkedin_url: linkedinUrl }),
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
    linkedin_url: linkedinUrl,
    nome: dados.person_full_name || dados.full_name || null,
    cargo: dados.person_job_title || dados.job_title || null,
    empresa:
      dados.person_company_name || dados.company_name || dados.company || null,
    email: emailVerificado,
  };

  const { data: salvo } = await supabase
    .from("contatos")
    .insert({ ...contato, usuario_id: user.id })
    .select()
    .single();

  return NextResponse.json({
    encontrado: true,
    contato: salvo ?? contato,
    saldoContatos: novoSaldo,
  });
}
