-- ============================================================
-- FP Pipe · listas v2: guardar o resumo do ICP junto da lista
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.listas add column if not exists icp_resumo text;
