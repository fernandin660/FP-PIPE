import { NextResponse } from "next/server";
import { hashToken, publicarSite, tokenValido } from "../../../../lib/blog-aprovacao";
import { ORIGEM_SITE } from "../../../../lib/seo";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

/*
 * Botões "Aprovar" / "Recusar" da página /revisao-blog (formulário POST).
 * A autorização é o próprio link secreto: só quem recebeu o e-mail o tem.
 * Cada link decide uma única vez e expira em 14 dias.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = form?.get("t");
  const acao = form?.get("acao");
  if (!tokenValido(token) || (acao !== "aprovar" && acao !== "recusar")) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco não configurado." }, { status: 500 });

  const { data, error } = await admin
    .from("blog_aprovacoes")
    .update({ status: acao === "aprovar" ? "publicado" : "recusado", decidido_em: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .eq("status", "pendente")
    .gt("expira_em", new Date().toISOString())
    .select("id");
  if (error) return NextResponse.json({ erro: "Falha ao salvar." }, { status: 500 });

  let resultado = data && data.length ? acao : "invalido";
  if (resultado === "aprovar") {
    const ok = await publicarSite();
    if (!ok) resultado = "aprovar-sem-deploy";
  }

  const volta = new URL("/revisao-blog", ORIGEM_SITE);
  volta.searchParams.set("t", token);
  volta.searchParams.set("r", resultado);
  return NextResponse.redirect(volta, 303);
}
