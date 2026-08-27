-- FP Pipe - conexões de e-mail autorizadas pelo usuário.

create table if not exists public.email_conexoes (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  provedor text not null check (provedor in ('google', 'microsoft')),
  email text not null,
  refresh_token_criptografado text not null,
  escopos text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists email_conexoes_org_idx on public.email_conexoes (organizacao_id);
alter table public.email_conexoes enable row level security;

drop policy if exists "Usuario gerencia sua conexao de email" on public.email_conexoes;
create policy "Usuario gerencia sua conexao de email"
  on public.email_conexoes for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
