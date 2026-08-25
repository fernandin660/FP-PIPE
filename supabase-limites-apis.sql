-- Limites por API externa, ajustáveis ao vivo pelo console /admin/uso
-- sem precisar de deploy. Sem policies = somente a service role
-- (backend) lê e escreve; usuários comuns não veem nada.
create table if not exists public.limites_apis (
  api text primary key,
  limite integer not null check (limite > 0),
  atualizado_em timestamptz not null default now()
);

alter table public.limites_apis enable row level security;
