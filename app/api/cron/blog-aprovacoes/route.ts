import { NextResponse } from "next/server";
import { listarAguardando } from "../../../../lib/blog";
import { VALIDADE_DIAS, enviarEmailAprovacao, novoToken } from "../../../../lib/blog-aprovacao";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";

/*
 * Cron diário (vercel.json): procura posts "aguardando" que ainda não têm
 * pedido de aprovação, cria um link secreto para cada um e manda UM e-mail
 * para o Fernando com todos.
 *
 * Proteção: com CRON_SECRET configurado, exige o cabeçalho da Vercel Cron.
 * Sem ele, a rotina continua inofensiva: só manda e-mail para o endereço
 * fixo, no máximo uma vez por post (a tabela tem chave única por post).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return NextResponse.json({ erro: "Banco não configurado." }, { status: 500 });

  const limite = new Date(Date.now() - VALIDADE_DIAS * 86400000).toISOString().slice(0, 10);
  const candidatos = listarAguardando().filter((p) => p.data >= limite);
  if (candidatos.length === 0) return NextResponse.json({ ok: true, enviados: 0 });

  const { data: existentes, error } = await admin
    .from("blog_aprovacoes")
    .select("blog, idioma, slug")
    .in("slug", candidatos.map((p) => p.slug));
  if (error) return NextResponse.json({ erro: "Falha ao ler aprovações." }, { status: 500 });

  const ja = new Set((existentes ?? []).map((l) => `${l.blog}/${l.idioma}/${l.slug}`));
  const novos = candidatos.filter((p) => !ja.has(`${p.blog}/${p.idioma}/${p.slug}`));

  const itens = [];
  for (const post of novos) {
    const { token, hash } = novoToken();
    const { error: erroInsert } = await admin.from("blog_aprovacoes").insert({
      blog: post.blog,
      idioma: post.idioma,
      slug: post.slug,
      titulo: post.titulo.slice(0, 200),
      token_hash: hash,
      expira_em: new Date(Date.now() + VALIDADE_DIAS * 86400000).toISOString(),
    });
    if (!erroInsert) itens.push({ post, token });
  }

  if (itens.length === 0) return NextResponse.json({ ok: true, enviados: 0 });

  const enviado = await enviarEmailAprovacao(itens);
  if (!enviado) {
    // Sem e-mail, desfaz os pedidos para tentar de novo amanhã.
    for (const { post } of itens) {
      await admin
        .from("blog_aprovacoes")
        .delete()
        .match({ blog: post.blog, idioma: post.idioma, slug: post.slug, status: "pendente" });
    }
    return NextResponse.json({ erro: "E-mail não enviado." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, enviados: itens.length });
}
