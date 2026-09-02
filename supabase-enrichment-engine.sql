-- ============================================================
-- FP Pipe · Enrichment Engine — Fase 3a (auditoria + custo + cache)
--
-- Rode este script inteiro no Supabase > SQL Editor > New query.
--
-- Contém (todas ADITIVAS, não destrutivas):
--   1. enriquecimento_custos   — matriz de custo por provider/tipo
--   2. enriquecimento_attempts — auditoria de cada tentativa (org-scoped)
--   3. metadados no enriquecimento_cache (colunas novas, aditivas)
--
-- NÃO faz DELETE/UPDATE em massa. Não altera dados existentes.
-- O custo padrão do MillionPhones (1 crédito de telefone) é preservado
-- na matriz, mantendo a cobrança atual compatível.
-- ============================================================

-- 1) Matriz de custo por provider/tipo de dado
create table if not exists public.enriquecimento_custos (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  tipo_dado text not null,
  moeda text not null default 'credito',
  creditos integer not null default 0,
  custo_estimado numeric not null default 0,
  vigencia date not null default current_date,
  organizacao_id uuid references public.organizacoes(id) on delete cascade,
  tabela_creditos text not null default 'creditos',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (provider, tipo_dado, vigencia, organizacao_id)
);

create index if not exists idx_ecustos_provider
  on public.enriquecimento_custos (provider);

alter table public.enriquecimento_custos enable row level security;

drop policy if exists "enriquecimento_custos_select" on public.enriquecimento_custos;
create policy "enriquecimento_custos_select" on public.enriquecimento_custos
  for select to authenticated
  using (
    organizacao_id is null
    or (organizacao_id is not null and public._usuario_membro(organizacao_id))
  );

-- 2) Auditoria de tentativas
create table if not exists public.enriquecimento_attempts (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references public.organizacoes(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  provider text not null,
  tipo_dado text not null,
  alvo_tipo text not null default 'contato',
  alvo_id uuid,
  alvo_chave text,
  success boolean not null default false,
  cache_hit boolean not null default false,
  encontrado boolean not null default false,
  credito_consumido integer not null default 0,
  custo_estimado numeric not null default 0,
  moeda text not null default 'credito',
  request_id text,
  resultado text,
  fonte text,
  confianca integer,
  erro_codigo text,
  erro_mensagem text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_attempts_org_created
  on public.enriquecimento_attempts (organizacao_id, criado_em desc);
create index if not exists idx_attempts_provider
  on public.enriquecimento_attempts (provider, criado_em desc);
create index if not exists idx_attempts_alvo
  on public.enriquecimento_attempts (alvo_tipo, alvo_id);
create index if not exists idx_attempts_request
  on public.enriquecimento_attempts (request_id);

alter table public.enriquecimento_attempts enable row level security;

drop policy if exists "enriquecimento_attempts_select" on public.enriquecimento_attempts;
create policy "enriquecimento_attempts_select" on public.enriquecimento_attempts
  for select to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- 3) Metadados no cache (aditivo, não destrutivo)
alter table public.enriquecimento_cache
  add column if not exists tipo_dado text;
alter table public.enriquecimento_cache
  add column if not exists fonte text;
alter table public.enriquecimento_cache
  add column if not exists provider_origem text;
alter table public.enriquecimento_cache
  add column if not exists confianca integer;
alter table public.enriquecimento_cache
  add column if not exists tipo_telefone text;
alter table public.enriquecimento_cache
  add column if not exists data_consulta timestamptz;
alter table public.enriquecimento_cache
  add column if not exists org_criadora uuid;

-- 4) Seed do custo atual (MillionPhones telefone = 1 crédito de telefone)
insert into public.enriquecimento_custos (provider, tipo_dado, moeda, creditos, custo_estimado, vigencia, organizacao_id, tabela_creditos, ativo)
values ('millionphones', 'telefone', 'credito', 1, 0, current_date, null, 'creditos_telefone', true)
on conflict (provider, tipo_dado, vigencia, organizacao_id) do nothing;
