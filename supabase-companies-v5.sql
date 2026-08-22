-- ============================================================
-- FP Pipe · companies v5: Leads Manuais + LinkedIn
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

-- Lead manual pode nascer sem CNPJ (Postgres permite vários NULL
-- na unique, então cada lead manual fica livre de conflito)
alter table public.companies alter column cnpj drop not null;

alter table public.companies add column if not exists linkedin text;

alter table public.companies add column if not exists origem text
  not null default 'busca';
