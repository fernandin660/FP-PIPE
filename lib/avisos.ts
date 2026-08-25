import { criarClienteSupabaseAdmin } from "./supabase/admin";

const EMAIL_DESTINO =
  process.env.EMAIL_AVISOS ?? "fernandopugliesi@fppipe.com.br";
const CHAVE_RESEND = process.env.RESEND_API_KEY ?? "";

// Franquias por API externa — valores PADRÃO refletindo nossas contas
// atuais. Podem ser sobrescritos ao vivo pela tabela `limites_apis`
// (console /admin/uso), sem precisar de deploy.
//
// De onde vem cada número:
// - maps: Google Maps Platform, crédito grátis de US$200/mês
//   (~5 mil text searches com folga para outros endpoints).
// - anymail: conta free do Anymail Finder = 200 créditos no total.
// - openai: pay-as-you-go sem teto rígido; 2000 é vigia de volume.
// - serper: 2.500 créditos grátis no signup (únicos, não renovam).
// - casadosdados: endpoint público extra-oficial; 5000 é sanidade.
// - minhareceita: API pública da Receita; 3000 é cortesia/sanity.
// - nominatim: política pública ~1 req/s; 2000/mês é seguro.
// - overpass: servidor público; 1500/mês evita sobrecarregá-lo.
// - resend: plano free = 100 e-mails/dia ≈ 3000/mês.
export const LIMITES_MENSAIS: Record<string, number> = {
  maps: 5000,
  anymail: 200,
  openai: 2000,
  serper: 2500,
  casadosdados: 5000,
  minhareceita: 3000,
  nominatim: 2000,
  overpass: 1500,
  resend: 3000,
};

// Lê overrides da tabela limites_apis (se existir) e mescla sobre os
// padrões. Tabela ausente ou erro = usa os padrões sem falhar.
export async function limitesEfetivos(): Promise<Record<string, number>> {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { ...LIMITES_MENSAIS };

  try {
    const { data, error } = await admin
      .from("limites_apis")
      .select("api, limite");

    if (error || !data) return { ...LIMITES_MENSAIS };

    const efetivos = { ...LIMITES_MENSAIS };
    for (const linha of data) {
      if (
        typeof linha.api === "string" &&
        Number.isFinite(linha.limite) &&
        linha.limite > 0
      ) {
        efetivos[linha.api] = linha.limite;
      }
    }
    return efetivos;
  } catch {
    return { ...LIMITES_MENSAIS };
  }
}

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

    // Limite padrão pode estar sobrescrito na tabela limites_apis.
    let limite = LIMITES_MENSAIS[api];
    try {
      const { data: ajuste, error: erroAjuste } = await admin
        .from("limites_apis")
        .select("limite")
        .eq("api", api)
        .maybeSingle();
      if (!erroAjuste && ajuste && Number.isFinite(ajuste.limite)) {
        limite = ajuste.limite;
      }
    } catch {
      // Tabela ainda não existe: usa o padrão.
    }

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
        `A API "${api}" registrou ${chamadas} chamadas neste mês, chegando ao limite configurado (${limite}).\n\nO que fazer:\n- Conferir consumo no painel do provedor\n- Ajustar o limite no console /admin/uso (botão de lápis)\n- Considerar upgrade da conta no provedor\n\nEste e-mail é automático e só dispara uma vez por mês.`,
      );
    }
  } catch {
    // Monitoramento nunca derruba o fluxo do usuario.
  }
}
