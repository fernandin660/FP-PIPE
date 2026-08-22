-- ============================================================
-- FP PIPE — SCRIPT DE CONFIGURACAO DO BANCO (Supabase)
-- Cole este script inteiro no SQL Editor do Supabase e clique
-- em RUN.
-- ============================================================

-- Tabela que guarda cada ICP gerado pelos usuarios
create table if not exists public.icps (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome_empresa text,
  area_atuacao text,
  segmentos text[] default '{}',
  dados jsonb not null,
  criado_em timestamptz not null default now()
);

-- Seguranca: cada usuario so ve e cria os proprios ICPs
alter table public.icps enable row level security;

drop policy if exists "Usuario acessa apenas seus ICPs" on public.icps;

create policy "Usuario acessa apenas seus ICPs"
on public.icps
for all
to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);
