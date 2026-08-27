import { NextResponse } from "next/server";

import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { DEFINICAO_PLANOS, type PlanoChave } from "../../../../lib/planos";

// ============================================================
// Cron diário: verifica assinaturas que expiraram e envia
// aviso ao admin se a renovação não foi processada.
//
// Para chamar: GET /api/cron/verificar-renovacoes
// Proteger com CRON_SECRET (verificar header x-cron-secret).
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(req: Request) {
  // Validação do cron secret (Vercel Cron ou chamada manual)
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ erro: "Banco não configurado." }, { status: 500 });
  }

  const agora = new Date();

  // Busca assinaturas ativas que já expiraram (renova_em < agora)
  const { data: expiradas, error } = await admin
    .from("assinaturas")
    .select("id, usuario_id, organizacao_id, plano, ciclo, renova_em, mp_payment_id")
    .eq("status", "ativa")
    .lt("renova_em", agora.toISOString());

  if (error) {
    console.error("Erro ao buscar assinaturas expiradas:", error);
    return NextResponse.json({ erro: "Consulta falhou." }, { status: 500 });
  }

  if (!expiradas || expiradas.length === 0) {
    return NextResponse.json({ ok: true, expiradas: 0 });
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const resultados = [];

  for (const assinatura of expiradas) {
    try {
      // Verifica se o pagamento mais recente foi aprovado
      let pagamentoAprovado = false;

      if (token && assinatura.mp_payment_id) {
        const respostaMp = await fetch(
          `https://api.mercadopago.com/v1/payments/${assinatura.mp_payment_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (respostaMp.ok) {
          const pagamento = await respostaMp.json();
          pagamentoAprovado = pagamento.status === "approved";
        }
      }

      if (pagamentoAprovado) {
        // Pagamento aprovado mas webhook não processou — processa manualmente
        const definicao = DEFINICAO_PLANOS[assinatura.plano as PlanoChave];
        if (definicao) {
          const renovaEm = new Date(
            agora.getTime() + (assinatura.ciclo === "anual" ? 365 : 30) * 86400000
          );

          await admin
            .from("assinaturas")
            .update({
              status: "ativa",
              renova_em: renovaEm.toISOString(),
              atualizado_em: agora.toISOString(),
            })
            .eq("id", assinatura.id);

          // Recarrega créditos
          if (definicao.buscasMes && definicao.buscasMes > 0) {
            const { data: atual } = await admin
              .from("creditos_contatos")
              .select("saldo")
              .eq("organizacao_id", assinatura.organizacao_id)
              .maybeSingle();

            if (atual) {
              await admin
                .from("creditos_contatos")
                .update({
                  saldo: atual.saldo + definicao.buscasMes,
                })
                .eq("organizacao_id", assinatura.organizacao_id);
            } else {
              await admin
                .from("creditos_contatos")
                .insert({
                  organizacao_id: assinatura.organizacao_id,
                  saldo: definicao.buscasMes,
                });
            }
          }

          if (definicao.listasMes > 0) {
            const { data: listaAtual } = await admin
              .from("creditos")
              .select("saldo")
              .eq("organizacao_id", assinatura.organizacao_id)
              .maybeSingle();

            if (listaAtual) {
              await admin
                .from("creditos")
                .update({
                  saldo: listaAtual.saldo + definicao.listasMes,
                  atualizado_em: agora.toISOString(),
                })
                .eq("organizacao_id", assinatura.organizacao_id);
            } else {
              await admin
                .from("creditos")
                .insert({
                  organizacao_id: assinatura.organizacao_id,
                  saldo: definicao.listasMes,
                });
            }
          }

          resultados.push({
            orgId: assinatura.organizacao_id,
            status: "renovado_manualmente",
          });
        }
      } else {
        // Pagamento não aprovado — marca como expirada e avisa
        await admin
          .from("assinaturas")
          .update({
            status: "expirada",
            atualizado_em: agora.toISOString(),
          })
          .eq("id", assinatura.id);

        // Envia aviso de expiração
        await enviarAvisoExpiracao(assinatura.organizacao_id, assinatura.plano);

        resultados.push({
          orgId: assinatura.organizacao_id,
          status: "expirada",
        });
      }
    } catch (err) {
      console.error(`Erro ao processar assinatura ${assinatura.id}:`, err);
      resultados.push({
        orgId: assinatura.organizacao_id,
        status: "erro",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    expiradas: expiradas.length,
    resultados,
  });
}

// Aviso de expiração: envia e-mail ao admin quando assinatura expira
async function enviarAvisoExpiracao(orgId: string, plano: string) {
  try {
    const admin = criarClienteSupabaseAdmin();
    if (!admin) return;

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
    const nomePlano =
      DEFINICAO_PLANOS[plano as keyof typeof DEFINICAO_PLANOS]?.nome ?? plano;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://fp-pipe-psi.vercel.app";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FP Pipe <avisos@fppipe.com.br>",
        to: [emailDono],
        subject: `Assinatura ${nomePlano} expirada — ${nomeOrg}`,
        text: `Sua assinatura ${nomePlano} da organização "${nomeOrg}" expirou e não foi renovada.\n\nPara continuar usando o FP Pipe, acesse ${appUrl}/planos e faça uma nova assinatura.\n\nSe o pagamento foi processado e mesmo assim expirou, entre em contato com o suporte.\n\nFP Pipe`,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Aviso de expiração nunca derruba o fluxo.
  }
}
