import type { Metadata } from "next";
import Envelope from "../../../components/studio/Envelope";
import { BLOGS, buscarQualquer, caminhoBlog, type Blog } from "../../../lib/blog";
import { PUBLICO_IDIOMA, hashToken, tokenValido } from "../../../lib/blog-aprovacao";
import { ehIdioma } from "../../../components/studio/dicionario";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { ORIGEM_SITE } from "../../../lib/seo";

/*
 * Revisão de um post automático, aberta pelo link secreto do e-mail.
 * Nunca entra no Google (noindex + X-Robots-Tag) e não repassa o link
 * para os sites citados no texto (referrer desligado).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Revisão do blog",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

type Linha = { blog: string; idioma: string; slug: string; status: string; expira_em: string; decidido_em: string | null };

const MENSAGENS: Record<string, { texto: string; cor: string }> = {
  aprovar: { texto: "Aprovado! O post entra no site em cerca de 2 minutos.", cor: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  "aprovar-sem-deploy": {
    texto: "Aprovado! O post entra no site na próxima atualização (a publicação automática não está configurada).",
    cor: "bg-emerald-50 text-emerald-900 border-emerald-200",
  },
  recusar: { texto: "Recusado. Este post não será publicado.", cor: "bg-[#f4f3ef] text-[#111114] border-[#d6d4cd]" },
  invalido: { texto: "Este link já foi usado ou expirou. Nada foi alterado.", cor: "bg-amber-50 text-amber-900 border-amber-200" },
};

/** Página dinâmica (sem cache): a hora atual é lida a cada visita. */
function jaExpirou(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <Envelope idioma="pt-BR">
      <main className="studio-container py-24">
        <p className="studio-selo mb-5">Revisão do blog</p>
        <p className="max-w-xl text-lg text-[#4b4b53]">{children}</p>
      </main>
    </Envelope>
  );
}

export default async function Pagina({ searchParams }: PageProps<"/revisao-blog">) {
  const { t, r } = await searchParams;
  if (!tokenValido(t)) return <Aviso>Link inválido.</Aviso>;

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return <Aviso>Banco não configurado.</Aviso>;
  const { data } = await admin
    .from("blog_aprovacoes")
    .select("blog, idioma, slug, status, expira_em, decidido_em")
    .eq("token_hash", hashToken(t))
    .maybeSingle<Linha>();
  if (!data || !BLOGS.includes(data.blog as Blog) || !ehIdioma(data.idioma)) return <Aviso>Link inválido.</Aviso>;

  const post = buscarQualquer(data.blog as Blog, data.idioma, data.slug);
  if (!post) return <Aviso>Não encontrei o texto deste post no site. Ele pode ter sido removido.</Aviso>;

  const expirado = jaExpirou(data.expira_em);
  const pendente = data.status === "pendente" && !expirado;
  const resultado = typeof r === "string" ? MENSAGENS[r] : undefined;
  const urlPublica = `${ORIGEM_SITE}${caminhoBlog(post.blog, post.idioma, post.slug)}`;

  return (
    <Envelope idioma="pt-BR">
      <main className="studio-container pb-24 pt-12 md:pt-16">
        <p className="studio-selo mb-4">Revisão do blog · {PUBLICO_IDIOMA[post.idioma] ?? post.idioma}</p>

        {resultado && <p className={`mb-8 max-w-[46rem] rounded-xl border px-5 py-4 text-sm ${resultado.cor}`}>{resultado.texto}</p>}

        {!resultado && data.status === "publicado" && (
          <p className="mb-8 max-w-[46rem] rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            Já aprovado. <a className="underline" href={urlPublica}>Ver no site</a>
          </p>
        )}
        {!resultado && data.status === "recusado" && (
          <p className="mb-8 max-w-[46rem] rounded-xl border border-[#d6d4cd] bg-[#f4f3ef] px-5 py-4 text-sm">Este post foi recusado.</p>
        )}
        {!resultado && data.status === "pendente" && expirado && (
          <p className="mb-8 max-w-[46rem] rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            O prazo para aprovar este post acabou.
          </p>
        )}

        <article className="max-w-[46rem]">
          {post.categoria && <p className="mb-3 text-sm text-[#5e5e66]">{post.categoria}</p>}
          <h1 className="text-[2rem] font-medium leading-[1.08] tracking-[-0.03em] md:text-[2.8rem]">{post.titulo}</h1>
          <p className="mt-5 text-lg text-[#4b4b53]">{post.descricao}</p>
          <p className="mt-4 border-t border-[#d6d4cd] pt-4 text-sm text-[#5e5e66]">
            {post.minutosLeitura} min de leitura · endereço: {caminhoBlog(post.blog, post.idioma, post.slug)}
          </p>
          <div lang={post.idioma} className="studio-artigo mt-10" dangerouslySetInnerHTML={{ __html: post.html }} />
        </article>

        {pendente && !resultado && (
          <div className="sticky bottom-4 mt-12 flex max-w-[46rem] flex-wrap gap-3 rounded-2xl border border-[#d6d4cd] bg-white/95 p-4 shadow-lg backdrop-blur">
            <form action="/api/blog/revisao" method="post">
              <input type="hidden" name="t" value={t} />
              <input type="hidden" name="acao" value="aprovar" />
              <button type="submit" className="rounded-full bg-[#2442e5] px-6 py-3 text-sm font-medium text-white hover:bg-[#1b34c0]">
                Aprovar e publicar
              </button>
            </form>
            <form action="/api/blog/revisao" method="post">
              <input type="hidden" name="t" value={t} />
              <input type="hidden" name="acao" value="recusar" />
              <button type="submit" className="rounded-full border border-[#d6d4cd] px-6 py-3 text-sm font-medium text-[#111114] hover:bg-[#f4f3ef]">
                Recusar
              </button>
            </form>
            <p className="basis-full text-xs text-[#5e5e66]">Quer um ajuste no texto? Recuse e me peça a mudança no chat.</p>
          </div>
        )}
      </main>
    </Envelope>
  );
}
