-- ============================================================
-- FP Pipe · Fase 2: Score de Aderência (dados de enriquecimento + score)
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.companies
  add column if not exists cnae_descricao text;

alter table public.companies
  add column if not exists capital_social numeric;

alter table public.companies
  add column if not exists porte text;

alter table public.companies
  add column if not exists data_abertura text;

alter table public.companies
  add column if not exists score integer;

alter table public.companies
  add column if not exists score_motivo text;
