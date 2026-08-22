-- ============================================================
-- FP Pipe · Fase 1: Descoberta de Empresas
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  cnpj text not null,
  razao_social text,
  nome_fantasia text,
  situacao_cadastral text,
  segmento_icp text,
  uf text,
  municipio text,
  telefone text,
  email text,
  fonte text not null default 'casadosdados',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, cnpj)
);

alter table public.companies enable row level security;

drop policy if exists "Usuario gerencia suas empresas" on public.companies;
create policy "Usuario gerencia suas empresas"
  on public.companies for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create index if not exists idx_companies_usuario on public.companies(usuario_id);
