-- FP Pipe — Contato institucional multi-fonte (Receita + Google Maps)
-- Execute no SQL Editor do Supabase.

alter table public.companies
  add column if not exists emails_extra text[] not null default '{}';

alter table public.companies
  add column if not exists telefones_extra text[] not null default '{}';
