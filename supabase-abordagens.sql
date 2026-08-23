-- FP Pipe — Fase A: Abordagens com IA
-- Execute no SQL Editor do Supabase.

-- Moeda 2: Créditos de IA (distinta de "creditos" [leads] e "creditos_contatos")
create table if not exists public.creditos_ia (
  usuario_id uuid primary key,
  saldo integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.creditos_ia enable row level security;

drop policy if exists "Dono ve seus creditos de ia" on public.creditos_ia;

create policy "Dono ve seus creditos de ia"
  on public.creditos_ia
  for select
  using (auth.uid() = usuario_id);

-- Histórico de abordagens geradas por lead
create table if not exists public.abordagens (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  company_id uuid not null,
  produto text not null,
  objetivo text not null,
  canal text not null,
  argumento text,
  assunto text,
  conteudo text not null,
  creditos_usados integer not null default 1,
  criado_em timestamptz not null default now()
);

create index if not exists abordagens_usuario_company_idx
  on public.abordagens (usuario_id, company_id, criado_em desc);

alter table public.abordagens enable row level security;

drop policy if exists "Dono gerencia suas abordagens" on public.abordagens;

create policy "Dono gerencia suas abordagens"
  on public.abordagens
  for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
