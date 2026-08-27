import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

export async function GET() {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, usuarioId } = gate.ctx!;
  const { data } = await supabase.from("email_conexoes").select("provedor, email, criado_em, atualizado_em").eq("usuario_id", usuarioId).maybeSingle();
  return NextResponse.json({ conexao: data ?? null });
}

export async function DELETE() {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco indisponível." }, { status: 503 });
  await admin.from("email_conexoes").delete().eq("usuario_id", gate.ctx!.usuarioId);
  return NextResponse.json({ ok: true });
}
