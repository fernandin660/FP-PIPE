import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../lib/gate";
import { podeEnviarCampanha } from "../../../../lib/planos";

export async function GET() {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;
  const { orgId, usuarioId, acesso } = gate.ctx!;
  const podeEnviar = podeEnviarCampanha(acesso.plano);
  const limiteDiario = podeEnviar ? (acesso.plano.toLowerCase().includes("platinum") ? 300 : 100) : 0;
  const data = new Date().toISOString().slice(0, 10);
  const { data: uso } = await gate.ctx!.supabase
    .from("uso_envios_email")
    .select("enviados, falhas")
    .eq("organizacao_id", orgId)
    .eq("usuario_id", usuarioId)
    .eq("data", data)
    .maybeSingle();
  // Métricas honestas: entregues/bounces não são rastreados (sem push
  // dos provedores), então não os reportamos como 0 — só o que é real.
  return NextResponse.json({ podeEnviar, limiteDiario, enviados: uso?.enviados ?? 0, falhas: uso?.falhas ?? 0, restantes: Math.max(0, limiteDiario - (uso?.enviados ?? 0)) });
}
