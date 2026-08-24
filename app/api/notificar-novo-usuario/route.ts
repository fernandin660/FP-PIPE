import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { registrarUso } from "../../../lib/avisos";

const EMAIL_DONO =
  process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br";
const CHAVE_RESEND = process.env.RESEND_API_KEY ?? "";

export async function POST() {
  try {
    const gate = await exigirAcesso();
    if (gate.resposta) {
      return gate.resposta;
    }
    const { supabase, usuarioId, acesso } = gate.ctx!;

    const admin = criarClienteSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    // Dedupe: só notifica se conseguir inserir a primeira vez.
    const { data: inserido, error: erroInsert } = await admin
      .from("usuarios_notificados")
      .insert({ usuario_id: usuarioId })
      .select("usuario_id");

    if (erroInsert || !inserido || inserido.length === 0) {
      return NextResponse.json({ ok: true, jaNotificado: true });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const emailUsuario = user?.email ?? "(sem e-mail)";
    const criadoEm = user?.created_at
      ? new Date(user.created_at).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })
      : "agora";

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
            to: [EMAIL_DONO],
            subject: `🎉 Novo usuário no FP Pipe: ${emailUsuario}`,
            text: `Um novo usuário entrou na plataforma.\n\nE-mail: ${emailUsuario}\nPlano atual: ${acesso.def.nome}\nConta criada em: ${criadoEm}\n\nEste aviso dispara uma única vez por usuário.`,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        // Falha no e-mail não pode quebrar o app do usuário novo.
      }
    }

    return NextResponse.json({ ok: true, jaNotificado: false });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
