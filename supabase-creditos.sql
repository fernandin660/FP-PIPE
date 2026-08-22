-- ============================================================
-- FP Pipe · Sistema de Créditos
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.creditos (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  saldo integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.creditos enable row level security;

drop policy if exists "Usuario gerencia seus creditos" on public.creditos;
create policy "Usuario gerencia seus creditos"
  on public.creditos for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
