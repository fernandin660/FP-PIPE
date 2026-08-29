import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";

export async function GET() {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { orgId, usuarioId, acesso } = gate.ctx!;
  const limiteDiario = acesso.plano.toLowerCase().includes("platinum") ? 300 : 100;
  const data = new Date().toISOString().slice(0, 10);
  const { data: uso } = await gate.ctx!.supabase
    .from("uso_envios_email")
    .select("enviados, entregues, falhas, bounces")
    .eq("organizacao_id", orgId)
    .eq("usuario_id", usuarioId)
    .eq("data", data)
    .maybeSingle();
  return NextResponse.json({ limiteDiario, enviados: uso?.enviados ?? 0, entregues: uso?.entregues ?? 0, falhas: uso?.falhas ?? 0, bounces: uso?.bounces ?? 0, restantes: Math.max(0, limiteDiario - (uso?.enviados ?? 0)) });
}
