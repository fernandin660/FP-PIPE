-- FP Pipe — Cache global de e-mails encontrados via provedor
-- Execute no SQL Editor do Supabase.

create table if not exists public.emails_cache (
  id uuid primary key default gen_random_uuid(),
  linkedin_url text not null unique,
  email text,
  nome text,
  cargo text,
  empresa text,
  criado_em timestamptz not null default now()
);

-- RLS ativado SEM políticas: clientes não leem/escrevem direto.
-- Somente o servidor (service role) acessa este cache.
alter table public.emails_cache enable row level security;
