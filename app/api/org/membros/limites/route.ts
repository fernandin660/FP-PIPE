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

  // Validação antifraude: a soma das cotas distribuídas entre os membros
  // não pode exceder o limite total do plano da organização.
  const { data: todosMembros } = await supabase
    .from("organizacao_membros")
    .select("id, limite_listas, limite_buscador, limite_telefone, limite_ia")
    .eq("organizacao_id", orgId);

  const def = acesso.def;

  if (atualizacao.limite_listas !== undefined && def.listasMes != null) {
    const somaOutros = (todosMembros ?? [])
      .filter((m) => m.id !== membroId)
      .reduce((acc, m) => acc + (m.limite_listas ?? 0), 0);
    const novoValor = atualizacao.limite_listas ?? 0;
    if (somaOutros + novoValor > def.listasMes) {
      return NextResponse.json(
        { erro: `A soma dos créditos de listas (${somaOutros + novoValor}) excede o limite total do plano ${def.nome} (${def.listasMes}).` },
        { status: 400 }
      );
    }
  }

  if (atualizacao.limite_buscador !== undefined && def.buscasMes != null) {
    const somaOutros = (todosMembros ?? [])
      .filter((m) => m.id !== membroId)
      .reduce((acc, m) => acc + (m.limite_buscador ?? 0), 0);
    const novoValor = atualizacao.limite_buscador ?? 0;
    if (somaOutros + novoValor > def.buscasMes) {
      return NextResponse.json(
        { erro: `A soma dos créditos de buscador (${somaOutros + novoValor}) excede o limite total do plano ${def.nome} (${def.buscasMes}).` },
        { status: 400 }
      );
    }
  }

  if (atualizacao.limite_telefone !== undefined) {
    const somaOutros = (todosMembros ?? [])
      .filter((m) => m.id !== membroId)
      .reduce((acc, m) => acc + (m.limite_telefone ?? 0), 0);
    const novoValor = atualizacao.limite_telefone ?? 0;
    if (somaOutros + novoValor > def.creditosTelefone) {
      return NextResponse.json(
        { erro: `A soma dos créditos de telefone (${somaOutros + novoValor}) excede o limite total do plano ${def.nome} (${def.creditosTelefone}).` },
        { status: 400 }
      );
    }
  }

  if (atualizacao.limite_ia !== undefined) {
    const somaOutros = (todosMembros ?? [])
      .filter((m) => m.id !== membroId)
      .reduce((acc, m) => acc + (m.limite_ia ?? 0), 0);
    const novoValor = atualizacao.limite_ia ?? 0;
    if (somaOutros + novoValor > def.creditosAbordagem) {
      return NextResponse.json(
        { erro: `A soma dos créditos de IA (${somaOutros + novoValor}) excede o limite total do plano ${def.nome} (${def.creditosAbordagem}).` },
        { status: 400 }
      );
    }
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
