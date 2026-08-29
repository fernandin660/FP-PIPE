import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

function normalizarEmail(valor: unknown): string {
  if (typeof valor !== "string") return "";
  try {
    const lista = JSON.parse(valor) as Array<{ mailId?: string; isPrimary?: boolean }>;
    if (Array.isArray(lista)) return lista.find((item) => item.isPrimary)?.mailId ?? lista[0]?.mailId ?? "";
  } catch {}
  return valor;
}

export async function GET() {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { supabase, usuarioId } = gate.ctx!;
  const { data } = await supabase.from("email_conexoes").select("provedor, email, criado_em, atualizado_em").eq("usuario_id", usuarioId).maybeSingle();
  return NextResponse.json({ conexao: data ? { ...data, email: normalizarEmail(data.email) } : null });
}

export async function DELETE() {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco indisponível." }, { status: 503 });
  await admin.from("email_conexoes").delete().eq("usuario_id", gate.ctx!.usuarioId);
  return NextResponse.json({ ok: true });
}
