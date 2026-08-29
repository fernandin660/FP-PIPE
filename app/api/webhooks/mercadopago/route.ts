import { NextResponse } from "next/server";

import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import {
  DEFINICAO_PLANOS,
  duracaoDias,
  type Ciclo,
  type PlanoChave,
} from "../../../../lib/planos";
import { enviarAvisoRenovacao } from "../../../../lib/avisos";

import crypto from "crypto";

function validarAssinaturaMp(req: Request, dataId: string): boolean {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  // Segurança: sem segredo configurado, falha fechado.
  // Nunca processa um webhook sem validar a assinatura.
  if (!segredo) {
    console.warn(
      "MP_WEBHOOK_SECRET ausente: webhook rejeitado por segurança."
    );
    return false;
  }

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
  if (!usuarioId || !definicao || plano === "teste" || !orgId) {
    console.error("Webhook MP com referência inválida:", pagamento.external_reference);
    return NextResponse.json({ ok: true });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ erro: "Banco não configurado." }, { status: 500 });
  }

  // Verifica se o comprador é admin da organização
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

  const agora = new Date();
  const renovaEm = new Date(agora.getTime() + duracaoDias(ciclo) * 86400000);

  // Verifica se já existe assinatura ativa pra esta org → é RENOVAÇÃO
  const { data: assinaturaExistente } = await admin
    .from("assinaturas")
    .select("plano, status, renova_em, mp_payment_id")
    .eq("organizacao_id", orgId)
    .maybeSingle();

  // Idempotência: se este pagamento já foi processado (retry de webhook
  // da Mercado Pago), não concede créditos/renova novamente.
  if (assinaturaExistente?.mp_payment_id === idPagamento) {
    return NextResponse.json({
      ok: true,
      plano,
      ciclo,
      jaProcessado: true,
    });
  }

  const isRenovacao = assinaturaExistente?.status === "ativa";

  // 1. Grava/atualiza assinatura (usa organizacao_id, não usuario_id)
  const { error: erroAssinatura } = await admin
    .from("assinaturas")
    .upsert(
      {
        usuario_id: usuarioId,
        organizacao_id: orgId,
        plano,
        status: "ativa",
        ciclo,
        origem: "mercadopago",
        mp_payment_id: idPagamento,
        inicio: isRenovacao ? assinaturaExistente?.renova_em ?? agora.toISOString() : agora.toISOString(),
        renova_em: renovaEm.toISOString(),
        atualizado_em: agora.toISOString(),
      },
      { onConflict: "organizacao_id" }
    );

  if (erroAssinatura) {
    console.error("Erro ao gravar assinatura:", erroAssinatura);
    return NextResponse.json({ erro: "Persistência falhou." }, { status: 500 });
  }

  // 2. Recarrega créditos de CONTATOS (usa organizacao_id)
  if (definicao.buscasMes && definicao.buscasMes > 0) {
    const { data: atual } = await admin
      .from("creditos_contatos")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();

    if (atual) {
      await admin
        .from("creditos_contatos")
        .update({
          saldo: atual.saldo + definicao.buscasMes,
        })
        .eq("organizacao_id", orgId);
    } else {
      await admin
        .from("creditos_contatos")
        .insert({ organizacao_id: orgId, saldo: definicao.buscasMes });
    }
  }

  // 3. Recarrega créditos de LISTAS (usa organizacao_id)
  if (definicao.listasMes > 0) {
    const { data: listaAtual } = await admin
      .from("creditos")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();

    if (listaAtual) {
      await admin
        .from("creditos")
        .update({
          saldo: listaAtual.saldo + definicao.listasMes,
          atualizado_em: agora.toISOString(),
        })
        .eq("organizacao_id", orgId);
    } else {
      await admin
        .from("creditos")
        .insert({ organizacao_id: orgId, saldo: definicao.listasMes });
    }
  }

  // Renova o saldo mensal compartilhado de créditos de abordagem.
  if (definicao.creditosAbordagem > 0) {
    const { data: abordagemAtual } = await admin
      .from("creditos_ia")
      .select("saldo")
      .eq("organizacao_id", orgId)
      .maybeSingle();

    if (abordagemAtual) {
      await admin
        .from("creditos_ia")
        .update({ saldo: definicao.creditosAbordagem, atualizado_em: agora.toISOString() })
        .eq("organizacao_id", orgId);
    } else {
      await admin.from("creditos_ia").insert({
        usuario_id: usuarioId,
        organizacao_id: orgId,
        saldo: definicao.creditosAbordagem,
        atualizado_em: agora.toISOString(),
      });
    }
  }

  // 4. Se é renovação, envia e-mail de confirmação
  if (isRenovacao) {
    void enviarAvisoRenovacao(orgId, plano, ciclo, renovaEm);
  }

  return NextResponse.json({
    ok: true,
    plano,
    ciclo,
    renovacao: isRenovacao,
  });
}
