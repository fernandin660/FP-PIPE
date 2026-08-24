-- ============================================================
-- CONTEXTO DO VENDEDOR E CONTATOS POR DEPARTAMENTO
-- 1. Perfil ganha nome do vendedor e tempo de empresa
--    (usados na assinatura das abordagens de IA).
-- 2. Cache global de e-mails ganha departamento_uso: um contato
--    encontrado para quem vende TI nao aparece pronto para
--    quem vende contabilidade ao mesmo lead.
-- Rodar no SQL Editor do Supabase.
-- ============================================================

alter table public.perfil
  add column if not exists nome_usuario text;

alter table public.perfil
  add column if not exists tempo_empresa text;

alter table public.emails_cache
  add column if not exists departamento_uso text not null default '';

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'perfil'
  and column_name in ('nome_usuario','tempo_empresa');
