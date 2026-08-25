import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { contarMembros } from "../../../../lib/org";
import { podeConvidar } from "../../../../lib/planos";
import { registrarUso } from "../../../../lib/avisos";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

const CHAVE_RESEND = process.env.RESEND_API_KEY ?? "";
const URL_APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-pipe-psi.vercel.app";

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, orgId, papel, acesso } = gate.ctx!;

  if (papel !== "admin") {
    return NextResponse.json(
      { erro: "Apenas administradores podem convidar membros." },
      { status: 403 }
    );
  }

  if (!podeConvidar(acesso.def)) {
    return NextResponse.json(
      {
        erro: `Seu plano ${acesso.def.nome} não inclui colaboradores. Faça upgrade para Gold ou Platinum.`,
        motivo: "plano_sem_equipe",
      },
      { status: 403 }
    );
  }

  let corpo: { email?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const email =
    typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { erro: "Informe um e-mail válido." },
      { status: 400 }
    );
  }

  // Verifica se já é membro (ativo ou pendente)
  const { data: existente } = await supabase
    .from("organizacao_membros")
    .select("id, status")
    .eq("organizacao_id", orgId)
    .eq("email_convite", email)
    .maybeSingle();

  if (existente?.status === "ativo") {
    return NextResponse.json(
      { erro: "Este e-mail já é membro da equipe." },
      { status: 409 }
    );
  }

  if (existente?.status === "convite_pendente") {
    return NextResponse.json(
      { erro: "Já existe um convite pendente para este e-mail." },
      { status: 409 }
    );
  }

  // Verifica limite de assentos
  const membrosAtivos = await contarMembros(supabase, orgId);
  if (membrosAtivos >= acesso.def.usuariosInclusos) {
    return NextResponse.json(
      {
        erro: `Limite de ${acesso.def.usuariosInclusos} membro(s) atingido. Faça upgrade para adicionar mais.`,
        motivo: "limite_assentos",
      },
      { status: 403 }
    );
  }

  // Cria o convite
  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { erro: "Serviço indisponível." },
      { status: 503 }
    );
  }

  const { error: erroInsert } = await admin
    .from("organizacao_membros")
    .insert({
      organizacao_id: orgId,
      email_convite: email,
      papel: "membro",
      status: "convite_pendente",
    });

  if (erroInsert) {
    return NextResponse.json(
      { erro: "Não foi possível criar o convite." },
      { status: 500 }
    );
  }

  // Busca nome da empresa para o e-mail
  const { data: org } = await supabase
    .from("organizacoes")
    .select("nome")
    .eq("id", orgId)
    .single();

  const nomeOrg = org?.nome ?? "sua empresa";

  // Envia e-mail via Resend
  if (CHAVE_RESEND) {
    try {
      void registrarUso("resend");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CHAVE_RESEND}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FP Pipe <avisos@fppipe.com.br>",
          to: [email],
          subject: `Convite para ${nomeOrg} no FP Pipe`,
          text: `Você foi convidado(a) para fazer parte da equipe de "${nomeOrg}" no FP Pipe.\n\nPara aceitar, faça login em ${URL_APP} e acesse a página de Equipe.\n\nSe ainda não tem conta, crie uma gratuitamente em ${URL_APP}/cadastro.\n\nEquipe FP Pipe`,
          html: `<p>Olá!</p><p>Você foi convidado(a) para fazer parte da equipe de <strong>${nomeOrg}</strong> no FP Pipe.</p><p>Para aceitar, faça login em <a href="${URL_APP}">${URL_APP}</a> e acesse a página de Equipe.</p><p>Se ainda não tem conta, crie uma gratuitamente em <a href="${URL_APP}/cadastro">${URL_APP}/cadastro</a>.</p><p>Equipe FP Pipe</p>`,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Falha no e-mail não impede o convite de ser criado.
    }
  }

  return NextResponse.json({
    ok: true,
    mensagem: `Convite enviado para ${email}.`,
  });
}
