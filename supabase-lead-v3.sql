-- FP Pipe — Enriquecimento manual do lead
-- Execute no SQL Editor do Supabase.

alter table public.companies
  add column if not exists informacoes_adicionais text;
