import { NextResponse } from "next/server";
import { hashToken, publicarSite, tokenValido } from "../../../../lib/blog-aprovacao";
import { ORIGEM_SITE } from "../../../../lib/seo";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

/*
 * Botões "Aprovar" / "Pedir ajustes" / "Recusar" da página /revisao-blog
 * (formulário POST, com o campo opcional de observações).
 * A autorização é o próprio link secreto: só quem recebeu o e-mail o tem.
 * Cada link decide uma única vez e expira em 14 dias.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = form?.get("t");
  const acao = form?.get("acao");
  const bruta = form?.get("obs");
  const obs = typeof bruta === "string" ? bruta.replace(/\r\n/g, "\n").trim().slice(0, 2000) : "";
  if (!tokenValido(token) || (acao !== "aprovar" && acao !== "recusar" && acao !== "ajustar")) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const volta = new URL("/revisao-blog", ORIGEM_SITE);
  volta.searchParams.set("t", token);
  if (acao === "ajustar" && !obs) {
    volta.searchParams.set("r", "sem-obs");
    return NextResponse.redirect(volta, 303);
  }
  const novoStatus = acao === "aprovar" ? "publicado" : acao === "recusar" ? "recusado" : "ajuste";

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco não configurado." }, { status: 500 });

  const { data, error } = await admin
    .from("blog_aprovacoes")
    .update({ status: novoStatus, decidido_em: new Date().toISOString(), observacao: obs || null })
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

  volta.searchParams.set("r", resultado);
  return NextResponse.redirect(volta, 303);
}
