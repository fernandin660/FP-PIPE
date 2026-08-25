import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../../lib/gate";
import { registrarUso } from "../../../../../lib/avisos";

const CHAVE_RESEND = process.env.RESEND_API_KEY ?? "";
const URL_APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-pipe-psi.vercel.app";

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, orgId, papel } = gate.ctx!;

  if (papel !== "admin") {
    return NextResponse.json(
      { erro: "Apenas administradores podem reenviar convites." },
      { status: 403 }
    );
  }

  let corpo: { membroId?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const membroId =
    typeof corpo.membroId === "string" ? corpo.membroId.trim() : "";

  if (!membroId) {
    return NextResponse.json(
      { erro: "Informe o membroId." },
      { status: 400 }
    );
  }

  // Busca o membro
  const { data: membro } = await supabase
    .from("organizacao_membros")
    .select("id, email_convite, status, criado_em")
    .eq("id", membroId)
    .eq("organizacao_id", orgId)
    .maybeSingle();

  if (!membro) {
    return NextResponse.json(
      { erro: "Membro não encontrado." },
      { status: 404 }
    );
  }

  if (membro.status !== "convite_pendente") {
    return NextResponse.json(
      { erro: "Este convite já foi aceito." },
      { status: 400 }
    );
  }

  const email = membro.email_convite;
  if (!email) {
    return NextResponse.json(
      { erro: "E-mail do convite não encontrado." },
      { status: 400 }
    );
  }

  // Busca nome da empresa
  const { data: org } = await supabase
    .from("organizacoes")
    .select("nome")
    .eq("id", orgId)
    .single();

  const nomeOrg = (org?.nome ?? "sua empresa").replace(/[<>"'&]/g, "");
  const linkAceitar = `${URL_APP}/equipe?convite=aceitar`;

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
          subject: `Convite para ${nomeOrg} no FP Pipe (reenviado)`,
          text: `Você foi convidado(a) para fazer parte da equipe de "${nomeOrg}" no FP Pipe.\n\nPara aceitar, faça login e acesse: ${linkAceitar}\n\nSe ainda não tem conta, crie uma gratuitamente em ${URL_APP}/cadastro e depois clique no link acima.\n\nEquipe FP Pipe`,
          html: `<p>Olá!</p><p>Você foi convidado(a) para fazer parte da equipe de <strong>${nomeOrg}</strong> no FP Pipe.</p><p>Para aceitar, faça login e clique no botão abaixo:</p><p><a href="${linkAceitar}" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Aceitar convite</a></p><p>Se ainda não tem conta, crie uma gratuitamente em <a href="${URL_APP}/cadastro">${URL_APP}/cadastro</a> e depois clique no botão acima.</p><p>Equipe FP Pipe</p>`,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Falha no e-mail não impede.
    }
  }

  return NextResponse.json({
    ok: true,
    mensagem: `Convite reenviado para ${email}.`,
  });
}
