import { NextResponse } from "next/server";

import { criarClienteSupabaseServidor } from "../../../../lib/supabase/server";
import {
  DEFINICAO_PLANOS,
  precoDoPlano,
  type Ciclo,
  type PlanoChave,
} from "../../../../lib/planos";
import { exigirAcesso } from "../../../../lib/gate";

export async function POST(req: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, papel } = gate.ctx!;

  if (papel !== "admin") {
    return NextResponse.json(
      { erro: "Apenas o administrador da empresa pode assinar ou alterar planos." },
      { status: 403 }
    );
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { erro: "Pagamentos ainda não configurados. Fale com o suporte." },
      { status: 500 }
    );
  }

  let corpo: { plano?: string; ciclo?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const plano = corpo.plano as PlanoChave;
  const ciclo = (corpo.ciclo === "anual" ? "anual" : "mensal") as Ciclo;

  if (!plano || !DEFINICAO_PLANOS[plano] || plano === "teste") {
    return NextResponse.json(
      { erro: "Escolha um dos planos pagos: Silver, Gold ou Platinum." },
      { status: 400 }
    );
  }

  const valor = precoDoPlano(plano, ciclo);
  const origem = req.headers.get("origin") || new URL(req.url).origin;

  // Regras de pagamento:
  // - mensal: exclusivamente cartao de credito (cobranca recorrente)
  // - anual: cartao de credito ou Pix
  // - sempre a vista, sem parcelamento
  const metodosPagamento =
    ciclo === "mensal"
      ? {
          installments: 1,
          excluded_payment_types: [
            { id: "ticket" },
            { id: "bank_transfer" },
            { id: "atm" },
            { id: "debit_card" },
          ],
        }
      : {
          installments: 1,
          excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        };

  // external_reference propaga com segurança até o webhook:
  // quem comprou, qual plano, qual ciclo e qual organização.
  const referenciaExterna = `${gate.ctx!.usuarioId}|${plano}|${ciclo}|${gate.ctx!.orgId}`;

  const respostaMp = await fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_reference: referenciaExterna,
        metadata: { plano, ciclo },
        items: [
          {
            title: `FP Pipe ${DEFINICAO_PLANOS[plano].nome} — ${ciclo}`,
            quantity: 1,
            unit_price: valor,
            currency_id: "BRL",
          },
        ],
        payment_methods: metodosPagamento,
        back_urls: {
          success: `${origem}/planos?status=sucesso`,
          pending: `${origem}/planos?status=pendente`,
          failure: `${origem}/planos?status=falhou`,
        },
        auto_return: "approved",
        notification_url: `${origem}/api/webhooks/mercadopago`,
      }),
    }
  );

  if (!respostaMp.ok) {
    const detalhe = await respostaMp.text();
    console.error("Erro Mercado Pago checkout:", detalhe);
    return NextResponse.json(
      { erro: "Não foi possível iniciar o pagamento." },
      { status: 502 }
    );
  }

  const preferencia = await respostaMp.json();

  return NextResponse.json({
    urlPagamento: preferencia.init_point,
    idPreferencia: preferencia.id,
  });
}
