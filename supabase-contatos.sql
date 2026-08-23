-- FP Pipe — Buscador de Contatos
-- Execute no SQL Editor do Supabase.

create table if not exists public.contatos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  linkedin_url text,
  nome text,
  cargo text,
  empresa text,
  email text,
  criado_em timestamptz not null default now()
);

alter table public.contatos enable row level security;

drop policy if exists "Dono gerencia seus contatos" on public.contatos;

create policy "Dono gerencia seus contatos"
  on public.contatos
  for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create table if not exists public.creditos_contatos (
  usuario_id uuid primary key,
  saldo integer not null default 0
);

alter table public.creditos_contatos enable row level security;

drop policy if exists "Dono ve seus creditos de contato" on public.creditos_contatos;

create policy "Dono ve seus creditos de contato"
  on public.creditos_contatos
  for select
  using (auth.uid() = usuario_id);
