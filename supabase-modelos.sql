-- FP Pipe — Modelos de abordagem + vínculo de abordagens com contatos
-- Execute no SQL Editor do Supabase.

-- Modelos salvos pelo usuário (templates reutilizáveis)
create table if not exists public.modelos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  nome text not null,
  canal text not null,
  objetivo text not null,
  produto text,
  argumento text,
  assunto text,
  conteudo text not null,
  criado_em timestamptz not null default now()
);

alter table public.modelos enable row level security;

drop policy if exists "Dono gerencia seus modelos" on public.modelos;

create policy "Dono gerencia seus modelos"
  on public.modelos
  for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- Abordagens podem nascer de um contato do Buscador (sem lead ainda)
alter table public.abordagens
  alter column company_id drop not null;

alter table public.abordagens
  add column if not exists contato_id uuid;
