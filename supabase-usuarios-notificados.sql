-- ============================================================
-- FP Pipe — Notificação de novo usuário (dedupe)
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.usuarios_notificados (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  notificado_em timestamptz not null default now()
);

alter table public.usuarios_notificados enable row level security;

-- Sem policies: somente o service role (rotas de API) acessa.
