-- Tabela de cache de enriquecimento de contatos
-- Armazena telefones e website encontrados para não re-buscar

create table if not exists public.enriquecimento_cache (
  id uuid primary key default gen_random_uuid(),
  linkedin_url text not null unique,
  telefones jsonb not null default '[]',
  website text,
  criado_em timestamptz not null default now()
);

alter table public.enriquecimento_cache enable row level security;

-- Apenas service role acessa (admin client)
create policy "enriquecimento_cache_service" on public.enriquecimento_cache
  for all to service_role
  using (true)
  with check (true);
