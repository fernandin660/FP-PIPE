import { NextRequest, NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../lib/supabase/server";

type RespostaReceita = {
  email?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
};

function telefoneUtil(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const digitos = valor.replace(/\D/g, "");
  return digitos.length >= 8 ? valor.trim() : null;
}

export async function POST(req: NextRequest) {
  const supabase = await criarClienteSupabaseServidor();

  if (!supabase) {
    return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Faça login novamente." }, { status: 401 });
  }

  const corpo = (await req.json().catch(() => null)) as {
    companyId?: string;
  } | null;

  const companyId = String(corpo?.companyId ?? "").trim();
  if (!companyId) {
    return NextResponse.json(
      { erro: "Lead inválido." },
      { status: 400 }
    );
  }

  const { data: empresa } = await supabase
    .from("companies")
    .select("id, cnpj, email, telefone, emails_extra, telefones_extra")
    .eq("id", companyId)
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa?.cnpj) {
    return NextResponse.json(
      { erro: "Este lead não tem CNPJ para consultar." },
      { status: 404 }
    );
  }

  const cnpjLimpo = String(empresa.cnpj).replace(/\D/g, "");

  let resposta: Response;

  try {
    resposta = await fetch(
      `https://minhareceita.org/${encodeURIComponent(cnpjLimpo)}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível falar com a base da Receita agora." },
      { status: 502 }
    );
  }

  if (!resposta.ok) {
    return NextResponse.json(
      {
        erro:
          resposta.status === 404
            ? "CNPJ não encontrado na base pública."
            : "Base da Receita indisponível no momento.",
      },
      { status: 502 }
    );
  }

  const receita = (await resposta.json()) as RespostaReceita;

  const emailEncontrado =
    typeof receita.email === "string" && receita.email.includes("@")
      ? receita.email.trim()
      : null;

  const telefoneEncontrado =
    telefoneUtil(receita.ddd_telefone_1) ?? telefoneUtil(receita.ddd_telefone_2);

  // Agrega fontes: preenche o primário se vazio; valor diferente vai pros extras.
  const patch: {
    email?: string;
    telefone?: string;
    emails_extra?: string[];
    telefones_extra?: string[];
  } = {};

  const emailsAtuais = (empresa.emails_extra ?? []) as string[];
  const telefonesAtuais = (empresa.telefones_extra ?? []) as string[];

  if (emailEncontrado && emailEncontrado !== (empresa.email ?? "").trim()) {
    if (!empresa.email) {
      patch.email = emailEncontrado;
    } else if (!emailsAtuais.some((e) => e.toLowerCase() === emailEncontrado.toLowerCase())) {
      patch.emails_extra = [emailEncontrado, ...emailsAtuais];
    }
  }

  if (
    telefoneEncontrado &&
    telefoneEncontrado.replace(/\D/g, "") !==
      (empresa.telefone ?? "").replace(/\D/g, "")
  ) {
    if (!empresa.telefone) {
      patch.telefone = telefoneEncontrado;
    } else if (
      !telefonesAtuais.some(
        (t) => t.replace(/\D/g, "") === telefoneEncontrado.replace(/\D/g, "")
      )
    ) {
      patch.telefones_extra = [telefoneEncontrado, ...telefonesAtuais];
    }
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from("companies").update(patch).eq("id", companyId);
  }

  return NextResponse.json({
    empresa: {
      email: patch.email ?? empresa.email ?? null,
      telefone: patch.telefone ?? empresa.telefone ?? null,
      emails_extra: patch.emails_extra ?? emailsAtuais,
      telefones_extra: patch.telefones_extra ?? telefonesAtuais,
    },
  });
}
