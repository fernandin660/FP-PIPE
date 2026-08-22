-- ============================================================
-- FP Pipe · companies v6: Fichas de Pessoas (Aprovador/Campeão)
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.companies add column if not exists aprovador_linkedin text;
alter table public.companies add column if not exists aprovador_telefone text;
alter table public.companies add column if not exists aprovador_email text;

alter table public.companies add column if not exists campeao_nome text;
alter table public.companies add column if not exists campeao_cargo text;
alter table public.companies add column if not exists campeao_linkedin text;
alter table public.companies add column if not exists campeao_telefone text;
alter table public.companies add column if not exists campeao_email text;

-- Usuário revisou/confirmou o lead -> pronto para enriquecimento externo (Apollo)
alter table public.companies add column if not exists confirmado
  boolean not null default false;
