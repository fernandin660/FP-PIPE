-- ============================================================
-- FP Pipe · companies v7: Endereço completo
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.companies add column if not exists endereco text;
