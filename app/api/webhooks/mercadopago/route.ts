import { NextResponse } from "next/server";

import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import {
  DEFINICAO_PLANOS,
  duracaoDias,
  type Ciclo,
  type PlanoChave,
} from "../../../../lib/planos";

import crypto from "crypto";

function validarAssinaturaMp(req: Request, dataId: string): boolean {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return true; // Sem segredo configurado, não bloqueia (log abaixo).

  const assinatura = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";

  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => p.trim().split("="))
  );
  const ts = partes["ts"];
  const hash = partes["v1"];
  if (!ts || !hash) return false;

  const manifesto = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const esperado = crypto
    .createHmac("sha256", segredo)
    .update(manifesto)
    .digest("hex");

  return esperado === hash;
}

interface CorpoWebhook {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

export async function POST(req: Request) {
  let corpo: CorpoWebhook;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const tipo = corpo.type || corpo.action || "";
  const idPagamento = String(corpo.data?.id || "");
  if (!idPagamento || !tipo.includes("payment")) {
    // Assinaturas recorrentes e outros eventos: ignorar por enquanto.
    return NextResponse.json({ ok: true, ignorado: tipo });
  }

  if (!validarAssinaturaMp(req, idPagamento)) {
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 401 });
  }
  if (!process.env.MP_WEBHOOK_SECRET) {
    console.warn("MP_WEBHOOK_SECRET ausente: webhook sem validação de assinatura.");
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    console.error("Webhook MP recebido sem MERCADOPAGO_ACCESS_TOKEN.");
    return NextResponse.json({ erro: "Não configurado." }, { status: 500 });
  }

  const respostaMp = await fetch(
    `https://api.mercadopago.com/v1/payments/${idPagamento}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!respostaMp.ok) {
    console.error("Falha ao consultar pagamento MP:", await respostaMp.text());
    return NextResponse.json({ erro: "Consulta falhou." }, { status: 502 });
  }

  const pagamento = await respostaMp.json();
  if (pagamento.status !== "approved") {
    return NextResponse.json({ ok: true, status: pagamento.status });
  }

  // Formato: "<usuario_id>|<plano>|<ciclo>|<org_id>" (definido no checkout).
  const [usuarioId, planoBruto, cicloBruto, orgId] =
    (pagamento.external_reference as string | undefined)?.split("|") || [];
  const plano = (pagamento.metadata?.plano ||
    planoBruto ||
    "") as PlanoChave;
  const ciclo = ((pagamento.metadata?.ciclo || cicloBruto) === "anual"
    ? "anual"
    : "mensal") as Ciclo;

  const definicao = DEFINICAO_PLANOS[plano];
  if (!usuarioId || !definicao || plano === "teste") {
    console.error("Webhook MP com referência inválida:", pagamento.external_reference);
    return NextResponse.json({ ok: true });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ erro: "Banco não configurado." }, { status: 500 });
  }

  // Verifica se o comprador é admin da organização
  if (orgId) {
    const { data: membro } = await admin
      .from("organizacao_membros")
      .select("papel")
      .eq("organizacao_id", orgId)
      .eq("usuario_id", usuarioId)
      .eq("status", "ativo")
      .maybeSingle();

    if (!membro || membro.papel !== "admin") {
      console.error(`Webhook MP rejeitado: usuário ${usuarioId} não é admin da org ${orgId}`);
      return NextResponse.json({ erro: "Comprador não é admin." }, { status: 403 });
    }
  }

  const agora = new Date();
  const renovaEm = new Date(agora.getTime() + duracaoDias(ciclo) * 86400000);

  const { error: erroAssinatura } = await admin
    .from("assinaturas")
    .upsert(
      {
        usuario_id: usuarioId,
        plano,
        status: "ativa",
        ciclo,
        origem: "mercadopago",
        mp_payment_id: idPagamento,
        inicio: agora.toISOString(),
        renova_em: renovaEm.toISOString(),
        atualizado_em: agora.toISOString(),
      },
      { onConflict: "usuario_id" }
    );

  if (erroAssinatura) {
    console.error("Erro ao gravar assinatura:", erroAssinatura);
    return NextResponse.json({ erro: "Persistência falhou." }, { status: 500 });
  }

  if (definicao.buscasMes && definicao.buscasMes > 0) {
    const { data: atual } = await admin
      .from("creditos_contatos")
      .select("saldo")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (atual) {
      await admin
        .from("creditos_contatos")
        .update({
          saldo: atual.saldo + definicao.buscasMes,
          atualizado_em: agora.toISOString(),
        })
        .eq("usuario_id", usuarioId);
    } else {
      await admin
        .from("creditos_contatos")
        .insert({ usuario_id: usuarioId, saldo: definicao.buscasMes });
    }
  }

  // Moeda de listas: recarrega o saldo mensal do plano a cada ciclo pago.
  if (definicao.listasMes > 0) {
    const { data: listaAtual } = await admin
      .from("creditos")
      .select("saldo")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (listaAtual) {
      await admin
        .from("creditos")
        .update({
          saldo: listaAtual.saldo + definicao.listasMes,
          atualizado_em: agora.toISOString(),
        })
        .eq("usuario_id", usuarioId);
    } else {
      await admin
        .from("creditos")
        .insert({ usuario_id: usuarioId, saldo: definicao.listasMes });
    }
  }

  return NextResponse.json({ ok: true, plano, ciclo });
}
