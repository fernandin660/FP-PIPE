-- ============================================================
-- FP Pipe · Fase 4-MVP b: Cargo campeão sugerido pela IA
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.companies
  add column if not exists cargo_prioritario text;
