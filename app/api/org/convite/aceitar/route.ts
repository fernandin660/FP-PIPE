import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";

export async function POST(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, usuarioId, orgId: orgAtual } = gate.ctx!;

  // Busca o e-mail do usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const emailUsuario = user?.email?.toLowerCase() ?? "";

  if (!emailUsuario) {
    return NextResponse.json(
      { erro: "Não foi possível identificar seu e-mail." },
      { status: 400 }
    );
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  // Busca convite pendente para este e-mail
  const { data: convite } = await admin
    .from("organizacao_membros")
    .select("id, organizacao_id, papel")
    .eq("email_convite", emailUsuario)
    .eq("status", "convite_pendente")
    .maybeSingle();

  if (!convite) {
    return NextResponse.json(
      { erro: "Nenhum convite pendente encontrado para este e-mail." },
      { status: 404 }
    );
  }

  const orgDestino = convite.organizacao_id;

  // 1. Atualiza o convite: define usuario_id e status=ativo
  const { error: erroUpdate } = await admin
    .from("organizacao_membros")
    .update({ usuario_id: usuarioId, status: "ativo" })
    .eq("id", convite.id);

  if (erroUpdate) {
    return NextResponse.json(
      { erro: "Não foi possível aceitar o convite." },
      { status: 500 }
    );
  }

  // 2. Remove a organização auto-criada pelo trigger (se for diferente do destino)
  if (orgAtual !== orgDestino) {
    // Migra dados para a org de destino
    const tabelas = [
      "creditos",
      "creditos_contatos",
      "creditos_ia",
      "assinaturas",
      "listas",
      "companies",
      "icps",
    ];

    for (const tabela of tabelas) {
      await admin
        .from(tabela)
        .update({ organizacao_id: orgDestino })
        .eq("usuario_id", usuarioId)
        .eq("organizacao_id", orgAtual);
    }

    // Remove a org antiga (e os membros dela)
    await admin
      .from("organizacao_membros")
      .delete()
      .eq("organizacao_id", orgAtual)
      .neq("usuario_id", usuarioId);

    await admin.from("organizacoes").delete().eq("id", orgAtual);
  }

  return NextResponse.json({
    ok: true,
    mensagem: "Convite aceito! Você agora faz parte da equipe.",
    orgId: orgDestino,
  });
}
