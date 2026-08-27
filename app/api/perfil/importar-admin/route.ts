import { NextResponse } from "next/server";

import { exigirAcesso } from "../../../../lib/gate";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

export async function POST() {
  const { ctx, resposta } = await exigirAcesso();
  if (resposta) return resposta;

  const { supabase, usuarioId, orgId, papel } = ctx!;
  if (papel === "admin") {
    return NextResponse.json({ erro: "O administrador já possui a configuração principal." }, { status: 400 });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco de dados indisponível." }, { status: 503 });

  const { data: membro } = await supabase
    .from("organizacao_membros")
    .select("usuario_id")
    .eq("organizacao_id", orgId)
    .eq("papel", "admin")
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (!membro?.usuario_id || membro.usuario_id === usuarioId) {
    return NextResponse.json({ erro: "Administrador da equipe não encontrado." }, { status: 404 });
  }

  const [{ data: perfilAdmin, error: erroLeitura }, { data: perfilAtual }] = await Promise.all([
    admin.from("perfil").select("nome_empresa, tempo_empresa, area_atuacao, departamento_uso, produtos_servicos, site, foto_url, anexos, nichos").eq("usuario_id", membro.usuario_id).maybeSingle(),
    supabase.from("perfil").select("nome_usuario").eq("usuario_id", usuarioId).maybeSingle(),
  ]);

  if (erroLeitura || !perfilAdmin) {
    return NextResponse.json({ erro: "O administrador ainda não possui um perfil preenchido." }, { status: 404 });
  }

  const perfil = { ...perfilAdmin, nome_usuario: perfilAtual?.nome_usuario ?? null, usuario_id: usuarioId };
  const { error } = await admin.from("perfil").upsert(perfil, { onConflict: "usuario_id" });
  if (error) return NextResponse.json({ erro: "Não foi possível importar as configurações." }, { status: 500 });

  return NextResponse.json({ perfil });
}
