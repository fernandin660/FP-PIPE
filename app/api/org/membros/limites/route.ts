import { NextResponse } from "next/server";
import { exigirAcesso } from "../../../../../lib/gate";

export async function PATCH(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, orgId, papel, acesso } = gate.ctx!;

  if (papel !== "admin") {
    return NextResponse.json(
      { erro: "Apenas administradores podem gerenciar limites de membros." },
      { status: 403 }
    );
  }

  // Verifica se o plano é Gold ou Platinum (ou permite distribuição)
  const planoAtual = acesso.plano.toLowerCase();
  if (!planoAtual.includes("gold") && !planoAtual.includes("platinum")) {
    return NextResponse.json(
      { erro: "A distribuição de créditos por membro está disponível apenas nos planos Gold e Platinum." },
      { status: 403 }
    );
  }

  let corpo: {
    membroId?: unknown;
    limite_listas?: unknown;
    limite_buscador?: unknown;
    limite_telefone?: unknown;
    limite_ia?: unknown;
  };

  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const membroId = typeof corpo.membroId === "string" ? corpo.membroId.trim() : "";
  if (!membroId) {
    return NextResponse.json({ erro: "Informe o membroId." }, { status: 400 });
  }

  const parseLimite = (val: unknown) => {
    if (val === null || val === undefined || val === "") return null;
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };

  const atualizacao: {
    limite_listas?: number | null;
    limite_buscador?: number | null;
    limite_telefone?: number | null;
    limite_ia?: number | null;
  } = {};

  if (corpo.limite_listas !== undefined) atualizacao.limite_listas = parseLimite(corpo.limite_listas);
  if (corpo.limite_buscador !== undefined) atualizacao.limite_buscador = parseLimite(corpo.limite_buscador);
  if (corpo.limite_telefone !== undefined) atualizacao.limite_telefone = parseLimite(corpo.limite_telefone);
  if (corpo.limite_ia !== undefined) atualizacao.limite_ia = parseLimite(corpo.limite_ia);

  // Verifica se o membro pertence à org
  const { data: membro, error: erroMembro } = await supabase
    .from("organizacao_membros")
    .select("id")
    .eq("id", membroId)
    .eq("organizacao_id", orgId)
    .maybeSingle();

  if (erroMembro || !membro) {
    return NextResponse.json({ erro: "Membro não encontrado nesta organização." }, { status: 404 });
  }

  const { error: erroUpdate } = await supabase
    .from("organizacao_membros")
    .update(atualizacao)
    .eq("id", membroId)
    .eq("organizacao_id", orgId);

  if (erroUpdate) {
    return NextResponse.json({ erro: "Não foi possível atualizar os limites do membro.", detalhe: erroUpdate.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
