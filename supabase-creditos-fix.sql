-- FP Pipe — Correção de permissões das tabelas de créditos
-- Execute no SQL Editor do Supabase (pode rodar mais de uma vez, não duplica nada).

create table if not exists public.creditos_ia (
  usuario_id uuid primary key,
  saldo integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.creditos_ia enable row level security;

drop policy if exists "Dono ve seus creditos de ia" on public.creditos_ia;
drop policy if exists "Dono gerencia seus creditos de ia" on public.creditos_ia;

create policy "Dono gerencia seus creditos de ia"
  on public.creditos_ia
  for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create table if not exists public.creditos_contatos (
  usuario_id uuid primary key,
  saldo integer not null default 0
);

alter table public.creditos_contatos enable row level security;

drop policy if exists "Dono ve seus creditos de contato" on public.creditos_contatos;
drop policy if exists "Dono gerencia seus creditos de contato" on public.creditos_contatos;

create policy "Dono gerencia seus creditos de contato"
  on public.creditos_contatos
  for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
