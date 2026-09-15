import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

export async function DELETE(request: Request) {
  const gate = await exigirAcesso();
  if (gate.resposta) return gate.resposta;

  const { supabase, orgId, papel, usuarioId } = gate.ctx!;

  let corpo: { membroId?: unknown; email?: unknown; sair?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  // ─── Sair da equipe (o próprio membro não-admin se remove) ───
  if (corpo.sair === true) {
    if (papel === "admin") {
      return NextResponse.json(
        { erro: "Administradores não podem sair da equipe." },
        { status: 403 }
      );
    }

    const admin = criarClienteSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { erro: "Serviço indisponível." },
        { status: 503 }
      );
    }

    const { error } = await admin
      .from("organizacao_membros")
      .delete()
      .eq("organizacao_id", orgId)
      .eq("usuario_id", usuarioId);

    if (error) {
      return NextResponse.json(
        { erro: "Não foi possível sair da equipe." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (papel !== "admin") {
    return NextResponse.json(
      { erro: "Apenas administradores podem remover membros." },
      { status: 403 }
    );
  }

  const membroId =
    typeof corpo.membroId === "string" ? corpo.membroId.trim() : "";
  const email =
    typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";

  if (!membroId && !email) {
    return NextResponse.json(
      { erro: "Informe membroId ou email." },
      { status: 400 }
    );
  }

  // Busca o membro
  let query = supabase
    .from("organizacao_membros")
    .select("id, usuario_id, papel, status")
    .eq("organizacao_id", orgId);

  if (membroId) {
    query = query.eq("id", membroId);
  } else {
    query = query.eq("email_convite", email);
  }

  const { data: membro } = await query.maybeSingle();

  if (!membro) {
    return NextResponse.json(
      { erro: "Membro não encontrado." },
      { status: 404 }
    );
  }

  // Não pode remover a si mesmo
  if (membro.usuario_id === gate.ctx!.usuarioId) {
    return NextResponse.json(
      { erro: "Você não pode remover a si mesmo." },
      { status: 400 }
    );
  }

  // Não pode remover outro admin
  if (membro.papel === "admin" && membro.status === "ativo") {
    return NextResponse.json(
      { erro: "Não é possível remover outro administrador." },
      { status: 400 }
    );
  }

  // Remove
  const { error } = await supabase
    .from("organizacao_membros")
    .delete()
    .eq("id", membro.id);

  if (error) {
    return NextResponse.json(
      { erro: "Não foi possível remover o membro." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
