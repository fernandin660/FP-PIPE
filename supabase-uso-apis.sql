-- ============================================================
-- FP Pipe -- Contador de uso das APIs pagas (monitoramento)
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.uso_apis (
  api text not null,
  mes text not null,
  chamadas integer not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (api, mes)
);

alter table public.uso_apis enable row level security;

-- Sem policies de proposito: apenas a service role grava/le esta tabela.
