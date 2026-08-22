-- ============================================================
-- FP Pipe · Fase 4-MVP: Decisores (QSA público da Receita)
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.companies
  add column if not exists decisor_nome text;

alter table public.companies
  add column if not exists decisor_cargo text;
