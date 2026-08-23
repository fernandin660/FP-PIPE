-- FP Pipe — Contatos v2: vínculo do contato encontrado com um lead (empresa)
-- Execute no SQL Editor do Supabase.

alter table public.contatos
  add column if not exists company_id uuid;

create index if not exists contatos_usuario_idx
  on public.contatos (usuario_id, criado_em desc);
