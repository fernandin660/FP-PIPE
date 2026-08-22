-- FP Pipe — Perfil v3: nichos de clientes ideais
-- Execute no SQL Editor do Supabase.

ALTER TABLE public.perfil
  ADD COLUMN IF NOT EXISTS nichos jsonb NOT NULL DEFAULT '[]'::jsonb;
