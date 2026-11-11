import { criarClienteSupabaseAdmin } from "./supabase/admin";
import { destaque, layoutEmail, listaItens, paragrafo, tabelaDados } from "./email-layout";
import { DEFINICAO_PLANOS } from "./planos";

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
// - openai: pay-as-you-go sem teto rígido; 2000 é vigia de volume.
// - gemini: camada gratuita generosa do Google AI Studio; reserva
//   da OpenAI na pontuação de leads.
// - serper: 2.500 créditos grátis no signup (únicos, não renovam).
// - casadosdados: endpoint público extra-oficial; 5000 é sanidade.
// - minhareceita: API pública da Receita; 3000 é cortesia/sanity.
// - nominatim: política pública ~1 req/s; 2000/mês é seguro.
// - overpass: servidor público; 1500/mês evita sobrecarregá-lo.
// - resend: plano free = 100 e-mails/dia ≈ 3000/mês.
export const LIMITES_MENSAIS: Record<string, number> = {
  maps: 5000,
  openai: 2000,
  gemini: 5000,
  groq: 3000,
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

async function enviarEmailHtml(
  para: string[],
  assunto: string,
  html: string,
  textoFallback: string
) {
  if (!CHAVE_RESEND || para.length === 0) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CHAVE_RESEND}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FP Pipe <avisos@fppipe.com.br>",
        to: para,
        subject: assunto,
        text: textoFallback,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Falha no e-mail não derruba o fluxo.
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
        `FP Pipe: ${api} atingiu ${chamadas} chamadas em ${mes}`,
        `A API "${api}" registrou ${chamadas} chamadas neste mês, chegando ao limite configurado (${limite}).\n\nO que fazer:\n- Conferir consumo no painel do provedor\n- Ajustar o limite no console /admin/uso\n- Considerar upgrade da conta no provedor\n\nEste e-mail é automático e só dispara uma vez por mês.`,
      );
    }
  } catch {
    // Monitoramento nunca derruba o fluxo do usuario.
  }
}

// ============================================================
// Alerta de créditos baixos: notifica quando saldo de qualquer
// moeda interna (creditos, creditos_contatos, creditos_ia) cai
// para 1 ou menos. Envia no máximo 1 e-mail por org por moeda.
// ============================================================

const TABELAS_CREDITOS = [
  { tabela: "creditos", label: "Buscas (listas)" },
  { tabela: "creditos_contatos", label: "Créditos de Lead" },
  { tabela: "creditos_telefone", label: "Créditos de Telefone" },
  { tabela: "creditos_ia", label: "Créditos de IA" },
] as const;

export async function verificarCreditosBaixos(orgId: string) {
  try {
    const admin = criarClienteSupabaseAdmin();
    if (!admin) return;

    for (const { tabela, label } of TABELAS_CREDITOS) {
      const { data } = await admin
        .from(tabela)
        .select("saldo")
        .eq("organizacao_id", orgId)
        .maybeSingle();

      const saldo = data?.saldo ?? 0;

      // Quando chega a 0, envia e-mail de upsell (se não enviou ainda)
      if (saldo === 0) {
        void enviarUpsellCreditosEsgotados(orgId, tabela);
      }

      if (saldo > 1) continue;

      // Verifica se já enviou aviso para esta org+moeda neste mês
      const mes = new Date().toISOString().slice(0, 7);
      const chaveAlerta = `${orgId}:${tabela}`;

      const { data: jaAvisado } = await admin
        .from("alertas_creditos")
        .select("id")
        .eq("chave", chaveAlerta)
        .eq("mes", mes)
        .maybeSingle();

      if (jaAvisado) continue;

      // Busca nome da organização
      const { data: org } = await admin
        .from("organizacoes")
        .select("nome")
        .eq("id", orgId)
        .maybeSingle();

      const nomeOrg = org?.nome ?? "Desconhecida";

      await enviarAviso(
        `FP Pipe: ${label} baixo — ${nomeOrg}`,
        `A organização "${nomeOrg}" está com ${saldo} ${label.toLowerCase()} restante(s).\n\nTabela: ${tabela}\nSaldo: ${saldo}\n\nAção recomendada:\n- Verificar se o plano atual cobre a demanda\n- Considere upgrade em /planos\n- Verificar se há créditos extras disponíveis\n\nEste e-mail é automático e só dispara uma vez por mês por organização.`,
      );

      // Registra que já avisou (dedupe)
      await admin
        .from("alertas_creditos")
        .insert({ chave: chaveAlerta, mes })
        .select();
    }
  } catch {
    // Alerta nunca derruba o fluxo do usuario.
  }
}

// ============================================================
// E-mail de upsell: enviado quando os créditos gratuitos
// do usuário chegam a 0. Busca o e-mail do dono da org
// e envia um e-mail bonito com CTA para /planos.
// ============================================================

const URL_APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-pipe-psi.vercel.app";

export async function enviarUpsellCreditosEsgotados(
  orgId: string,
  moeda: string
) {
  try {
    const admin = criarClienteSupabaseAdmin();
    if (!admin) return;

    // Dedup: 1 e-mail por org por moeda por mês
    const mes = new Date().toISOString().slice(0, 7);
    const chaveUpsell = `upsell:${orgId}:${moeda}`;

    const { data: jaEnviado } = await admin
      .from("alertas_creditos")
      .select("id")
      .eq("chave", chaveUpsell)
      .eq("mes", mes)
      .maybeSingle();

    if (jaEnviado) return;

    // Busca dados da organização e do dono
    const { data: org } = await admin
      .from("organizacoes")
      .select("nome, dono_id")
      .eq("id", orgId)
      .maybeSingle();

    if (!org?.dono_id) return;

    const { data: dono } = await admin.auth.admin.getUserById(org.dono_id);
    const emailDono = dono?.user?.email;
    if (!emailDono) return;

    const nomeOrg = (org.nome ?? "sua empresa").replace(/[<>"'&]/g, "");
    const nomeMoeda = {
      creditos: "Buscas",
      creditos_contatos: "Créditos de Lead",
      creditos_ia: "Créditos de IA",
    }[moeda] ?? moeda;

    const html = layoutEmail({
      urlApp: URL_APP,
      selo: "Créditos",
      titulo: "Seus créditos acabaram",
      corpo:
        paragrafo(`${nomeMoeda} da organização ${destaque(nomeOrg)} chegaram a zero.`) +
        paragrafo("O que você pode fazer agora:") +
        listaItens([
          `${destaque("Continuar prospectando:")} escolha um plano e volte a gerar listas.`,
          `${destaque("Desbloquear contatos:")} e-mails e telefones verificados de quem decide.`,
          `${destaque("Abordagens por empresa:")} a primeira mensagem escrita para cada alvo.`,
        ]) +
        paragrafo(`Planos a partir de ${destaque("R$ 147/mês")}. Cancele quando quiser.`),
      cta: { texto: "Ver planos", url: `${URL_APP}/planos` },
    });

    const textoFallback = `Seus ${nomeMoeda} da organização "${nomeOrg}" esgotaram.

Escolha um plano e volte a prospectar:
${URL_APP}/planos

Planos a partir de R$ 147/mês. Cancele quando quiser.

FP Pipe`;

    await enviarEmailHtml(
      [emailDono],
      `Seus ${nomeMoeda} acabaram — FP Pipe`,
      html,
      textoFallback
    );

    // Registra dedup
    await admin
      .from("alertas_creditos")
      .insert({ chave: chaveUpsell, mes })
      .select();
  } catch {
    // Upsell nunca derruba o fluxo do usuario.
  }
}

// ============================================================
// Aviso de renovação: enviado quando o pagamento recorrente
// é processado com sucesso. Informa ao admin que a assinatura
// foi renovada e os créditos foram recarregados.
// ============================================================

export async function enviarAvisoRenovacao(
  orgId: string,
  plano: string,
  ciclo: string,
  renovaEm: Date
) {
  try {
    const admin = criarClienteSupabaseAdmin();
    if (!admin) return;

    // Busca dados da organização e do dono
    const { data: org } = await admin
      .from("organizacoes")
      .select("nome, dono_id")
      .eq("id", orgId)
      .maybeSingle();

    if (!org?.dono_id) return;

    const { data: dono } = await admin.auth.admin.getUserById(org.dono_id);
    const emailDono = dono?.user?.email;
    if (!emailDono) return;

    const nomeOrg = (org.nome ?? "sua empresa").replace(/[<>"'&]/g, "");
    const nomePlano = DEFINICAO_PLANOS[plano as keyof typeof DEFINICAO_PLANOS]?.nome ?? plano;
    const dataRenovacao = renovaEm.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = layoutEmail({
      urlApp: URL_APP,
      selo: "Assinatura",
      titulo: "Assinatura renovada",
      corpo:
        paragrafo(`A assinatura ${destaque(nomePlano)} da ${destaque(nomeOrg)} foi renovada com sucesso.`) +
        tabelaDados([
          ["Plano", `${nomePlano} (${ciclo})`],
          ["Próxima cobrança", dataRenovacao],
          ["Créditos", "Recarregados automaticamente"],
        ]),
      cta: { texto: "Continuar prospectando", url: `${URL_APP}/prospeccao` },
    });

    const textoFallback = `Assinatura renovada.

Plano: ${nomePlano} (${ciclo})
Próxima cobrança: ${dataRenovacao}
Créditos: Recarregados automaticamente

Continuar prospectando: ${URL_APP}/prospeccao

FP Pipe`;

    await enviarEmailHtml(
      [emailDono],
      `Assinatura ${nomePlano} renovada — FP Pipe`,
      html,
      textoFallback
    );
  } catch {
    // Aviso de renovação nunca derruba o fluxo.
  }
}
