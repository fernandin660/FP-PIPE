import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { contarMembros } from "../../../lib/org";
import { podeConvidar } from "../../../lib/planos";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";

export async function GET() {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, orgId, papel, acesso } = ctx!;

  const [{ data: org }, { data: membros }, totalMembros] = await Promise.all([
    supabase.from("organizacoes").select("nome").eq("id", orgId).single(),
    supabase
      .from("organizacao_membros")
      .select("id, usuario_id, papel, status, email_convite, criado_em")
      .eq("organizacao_id", orgId)
      .order("criado_em", { ascending: true }),
    contarMembros(supabase, orgId),
  ]);

  // Preenche email_convite para membros que não têm (admin auto-criado pelo trigger)
  const membrosResolvidos = await Promise.all(
    (membros ?? []).map(async (m) => {
      if (m.email_convite) return m;

      // Busca o e-mail do usuário via admin client
      const admin = criarClienteSupabaseAdmin();
      if (!admin || !m.usuario_id) return m;

      const { data: usuario } = await admin.auth.admin.getUserById(m.usuario_id);
      if (!usuario?.user?.email) return m;

      // Atualiza o email_convite na tabela pra não precisar buscar de novo
      await supabase
        .from("organizacao_membros")
        .update({ email_convite: usuario.user.email })
        .eq("id", m.id)
        .is("email_convite", null);

      return { ...m, email_convite: usuario.user.email };
    })
  );

  const permiteConvidar =
    podeConvidar(acesso.def) && papel === "admin";

  return NextResponse.json({
    orgId,
    papel,
    nome: org?.nome ?? "Minha Empresa",
    totalMembros,
    usuariosInclusos: acesso.def.usuariosInclusos,
    permiteConvidar,
    plano: acesso.plano,
    planoNome: acesso.def.nome,
    membros: membrosResolvidos,
  });
}
