-- FP Pipe — Contatos v3: múltiplos e-mails e telefones por pessoa
-- Execute no SQL Editor do Supabase.

alter table public.contatos
  add column if not exists emails text[] not null default '{}';

alter table public.contatos
  add column if not exists telefones text[] not null default '{}';

alter table public.contatos
  add column if not exists origem text;

create index if not exists contatos_company_idx
  on public.contatos (company_id);
