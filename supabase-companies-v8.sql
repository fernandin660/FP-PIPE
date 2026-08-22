-- ============================================================
-- FP Pipe · companies v8: E-mail de prospecção personalizado
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.companies add column if not exists email_assunto text;
alter table public.companies add column if not exists email_corpo text;
