import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { orgEmUsoReal } from "../../../../../lib/org";

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

  // ─── REGRA DE SEGURANÇA: um usuário pertence a UMA equipe ───
  // Admins de equipes ativas não podem entrar em outra equipe, e quem já
  // faz parte de uma equipe real não pode aceitar convite de outra equipe.
  // Somente orgs auto-criadas e vazias (plano teste, sem dados) podem ser
  // migradas/apagadas — o fluxo legítimo de "criou conta e foi convidado".
  const { data: minhasOrgs } = await admin
    .from("organizacao_membros")
    .select("organizacao_id, papel")
    .eq("usuario_id", usuarioId)
    .eq("status", "ativo");

  for (const org of minhasOrgs ?? []) {
    if (org.organizacao_id === orgDestino) continue;
    const ehReal = await orgEmUsoReal(admin, org.organizacao_id);

    if (org.papel === "admin" && ehReal) {
      return NextResponse.json(
        {
          erro:
            "Sua conta é administradora de uma equipe ativa (com plano pago, dados ou colaboradores). Administradores não podem entrar em outra equipe com a mesma conta. Para participar de outra organização, crie uma conta separada.",
          motivo: "admin_ja_possui_equipe",
        },
        { status: 403 }
      );
    }

    if (ehReal) {
      return NextResponse.json(
        {
          erro:
            "Sua conta já faz parte de outra equipe ativa. Cada usuário pode pertencer a apenas uma equipe. Peça ao administrador da sua equipe atual que remova seu acesso (ou saia da equipe em Equipe) antes de aceitar este convite.",
          motivo: "ja_possui_equipe",
        },
        { status: 403 }
      );
    }
  }

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
  //    Só ocorre quando a org atual é vazia (não-real) — já validado acima.
  if (orgAtual !== orgDestino) {
    // Migra dados para a org de destino (na prática, org vazia não tem dados)
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
