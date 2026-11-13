-- Aprovação dos posts do blog por e-mail.
-- Cada rascunho "aguardando" recebe um link secreto (só o hash fica salvo).
-- Só o servidor (service role) lê e escreve: RLS ligada e nenhuma política.

create table if not exists public.blog_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  blog text not null check (blog in ('sites', 'prospeccao')),
  idioma text not null check (idioma in ('pt', 'fr', 'en', 'es')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null,
  status text not null default 'pendente' check (status in ('pendente', 'publicado', 'recusado')),
  token_hash text not null unique,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  decidido_em timestamptz,
  unique (blog, idioma, slug)
);

alter table public.blog_aprovacoes enable row level security;
revoke all on public.blog_aprovacoes from anon, authenticated;

-- Pedidos de ajuste: observações do Fernando e novas versões do mesmo post.
-- "ajuste"   → ele pediu correção; a rotina corrige e marca "ajustado".
-- "ajustado" → versão antiga (histórico); a nova versão ganha outro link.
alter table public.blog_aprovacoes add column if not exists observacao text check (char_length(observacao) <= 2000);
alter table public.blog_aprovacoes drop constraint if exists blog_aprovacoes_status_check;
alter table public.blog_aprovacoes add constraint blog_aprovacoes_status_check check (status in ('pendente', 'publicado', 'recusado', 'ajuste', 'ajustado'));
alter table public.blog_aprovacoes drop constraint if exists blog_aprovacoes_blog_idioma_slug_key;
create unique index if not exists blog_aprovacoes_ativo_unico on public.blog_aprovacoes (blog, idioma, slug) where status <> 'ajustado';
