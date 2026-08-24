-- ============================================================
-- FP Pipe -- Departamento que usa o produto / influencia a compra
-- Rode no Supabase > SQL Editor > New query
-- ============================================================

alter table public.perfil
  add column if not exists departamento_uso text;
