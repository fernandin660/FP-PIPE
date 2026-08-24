import { criarClienteSupabaseAdmin } from "./supabase/admin";

const EMAIL_DESTINO =
  process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br";
const CHAVE_RESEND = process.env.RESEND_API_KEY ?? "";

// Franquias/planos reais por API externa. Quando o consumo do mês
// bate exatamente no limite, o dono recebe UM aviso por e-mail.
export const LIMITES_MENSAIS: Record<string, number> = {
  maps: 800,
  anymail: 350,
  openai: 2000,
  serper: 2500,
  casadosdados: 5000,
  minhareceita: 3000,
  nominatim: 2000,
  overpass: 1500,
  resend: 500,
};

async function enviarAviso(assunto: string, texto: string) {
  if (!CHAVE_RESEND) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHAVE_RESEND}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FP Pipe <avisos@fppipe.com.br>",
        to: [EMAIL_DESTINO],
        subject: assunto,
        text: texto,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Aviso nunca derruba o fluxo do usuario.
  }
}

// Conta chamadas por API no mes corrente. Quando bate exatamente no
// limite configurado, envia UM aviso por e-mail para o dono.
export async function registrarUso(api: string) {
  try {
    const admin = criarClienteSupabaseAdmin();
    if (!admin) return;

    const mes = new Date().toISOString().slice(0, 7);
    const limite = LIMITES_MENSAIS[api];

    const { data: atual } = await admin
      .from("uso_apis")
      .select("chamadas")
      .eq("api", api)
      .eq("mes", mes)
      .maybeSingle();

    const chamadas = (atual?.chamadas ?? 0) + 1;

    await admin
      .from("uso_apis")
      .upsert({ api, mes, chamadas }, { onConflict: "api,mes" });

    if (limite && chamadas === limite) {
      await enviarAviso(
        `⚠️ FP Pipe: ${api} atingiu ${chamadas} chamadas em ${mes}`,
        `A API "${api}" registrou ${chamadas} chamadas neste mes, chegando ao limite configurado (${limite}).\n\nO que fazer:\n- Conferir consumo no painel do provedor\n- Ajustar LIMITES_MENSAIS em lib/avisos.ts se necessario\n\nEste e-mail e automatico e so dispara uma vez por mes.`,
      );
    }
  } catch {
    // Monitoramento nunca derruba o fluxo do usuario.
  }
}
