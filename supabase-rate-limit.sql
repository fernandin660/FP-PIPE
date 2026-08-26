-- Tabela de rate limiting — controle de requisições por IP/rota
-- Limpeza automática a cada 5 minutos (via own query)

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  chave text not null,
  rota text not null,
  criado_em timestamptz not null default now()
);

-- Índice para queries de contagem (chave + rota + timestamp)
create index if not exists rate_limits_idx
  on public.rate_limits (chave, rota, criado_em desc);

-- RLS: apenas service role acessa
alter table public.rate_limits enable row level security;

create policy "rate_limits_service" on public.rate_limits
  for all to service_role
  using (true)
  with check (true);
