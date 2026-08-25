import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../lib/gate";
import { contarMembros } from "../../../lib/org";
import { podeConvidar } from "../../../lib/planos";

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
    membros: membros ?? [],
  });
}
