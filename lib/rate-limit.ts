import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "./supabase/admin";

// ============================================================
// Rate limiting via Supabase — sem Redis, sem dependência externa.
//
// Cada request é registrada com timestamp. A checagem conta
// quantas requests a mesma chave fez nos últimos X segundos.
// Janela deslizante (sliding window) — não reseta no início do minuto.
//
// Uso:
//   const blocked = await verificarRateLimit("user:abc123", "buscar-contato", 10, 60);
//   if (blocked) return blocked; // NextResponse 429
// ============================================================

type ResultadoRateLimit = {
  permitido: boolean;
  remaining: number;
  total: number;
  resetEm: number; // segundos até reset
};

export async function verificarRateLimit(
  chave: string,
  rota: string,
  maxRequests: number,
  janelaSegundos: number
): Promise<ResultadoRateLimit> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { permitido: true, remaining: maxRequests, total: 0, resetEm: 0 };

  const agora = new Date();
  const desde = new Date(agora.getTime() - janelaSegundos * 1000);

  try {
    // Conta requests na janela
    const { count } = await admin
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("chave", chave)
      .eq("rota", rota)
      .gte("criado_em", desde.toISOString());

    const total = count ?? 0;

    if (total >= maxRequests) {
      // Busca a request mais antiga na janela pra calcular reset
      const { data: maisAntiga } = await admin
        .from("rate_limits")
        .select("criado_em")
        .eq("chave", chave)
        .eq("rota", rota)
        .gte("criado_em", desde.toISOString())
        .order("criado_em", { ascending: true })
        .limit(1)
        .maybeSingle();

      const resetEm = maisAntiga
        ? Math.max(0, Math.ceil((new Date(maisAntiga.criado_em).getTime() + janelaSegundos * 1000 - agora.getTime()) / 1000))
        : janelaSegundos;

      return { permitido: false, remaining: 0, total, resetEm };
    }

    // Registra a request
    await admin.from("rate_limits").insert({
      chave,
      rota,
      criado_em: agora.toISOString(),
    });

    // Limpa requests antigas (> 5min) pra não encher a tabela
    const limpar = new Date(agora.getTime() - 5 * 60 * 1000);
    await admin
      .from("rate_limits")
      .delete()
      .lt("criado_em", limpar.toISOString());

    return {
      permitido: true,
      remaining: maxRequests - total - 1,
      total: total + 1,
      resetEm: janelaSegundos,
    };
  } catch {
    // Se a tabela não existir ou der erro, libera (não bloqueia o usuário)
    return { permitido: true, remaining: maxRequests, total: 0, resetEm: 0 };
  }
}

// Helper: retorna NextResponse 429 se bloqueado, null se ok
export async function exigirRateLimit(
  requisicao: Request,
  rota: string,
  maxRequests: number,
  janelaSegundos: number = 60,
  chaveExtra?: string
): Promise<import("next/server").NextResponse | null> {
  const ip =
    requisicao.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requisicao.headers.get("x-real-ip") ??
    "unknown";

  const chave = chaveExtra ? `${chaveExtra}:${ip}` : `ip:${ip}`;

  const resultado = await verificarRateLimit(chave, rota, maxRequests, janelaSegundos);

  if (!resultado.permitido) {
    return new NextResponse(
      JSON.stringify({
        erro: "Muitas requisições. Aguarde um momento e tente novamente.",
        retryAfter: resultado.resetEm,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(resultado.resetEm),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + resultado.resetEm),
        },
      }
    );
  }

  return null;
}
