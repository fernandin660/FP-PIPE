-- ============================================================
-- FP Pipe · CRM de Prospecção B2B — Fase 1 (pipeline + kanban)
--
-- Rode este script inteiro no Supabase > SQL Editor > New query.
--
-- Cria as entidades novas do CRM SOBRE a arquitetura existente,
-- SEM alterar o fluxo atual de geração/enriquecimento/scoring de
-- leads e SEM duplicar `companies`/`contatos`/score.
--
-- Entidades novas:
--   • pipeline_stages      — estágios configuráveis por organização
--   • lead_pipeline        — vincula uma `companies` existente ao pipeline
--   • pipeline_historico   — registra movimentações/eventos (extensível)
--
-- Padrão idempotente (IF NOT EXISTS + add column if not exists),
-- seguindo as migrations existentes do projeto.
-- ============================================================

-- ============================================================
-- 1. pipeline_stages
-- ============================================================
create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  nome text not null,
  ordem_estagio integer not null default 0,
  cor text not null default '#3b82f6',
  criado_em timestamptz not null default now(),
  unique (organizacao_id, nome)
);

create index if not exists idx_pipeline_stages_org
  on public.pipeline_stages (organizacao_id, ordem_estagio);

-- ============================================================
-- 2. lead_pipeline
-- ============================================================
create table if not exists public.lead_pipeline (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  responsavel_id uuid references auth.users(id) on delete set null,
  ordenacao integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organizacao_id, company_id)
);

create index if not exists idx_lead_pipeline_org
  on public.lead_pipeline (organizacao_id);
create index if not exists idx_lead_pipeline_company
  on public.lead_pipeline (company_id);
create index if not exists idx_lead_pipeline_stage
  on public.lead_pipeline (stage_id, ordenacao);
create index if not exists idx_lead_pipeline_responsavel
  on public.lead_pipeline (responsavel_id);

-- ============================================================
-- 3. pipeline_historico
--    Estrutura extensível: tipo_evento + dados jsonb permite
--    registrar futuramente atividades, e-mails, follow-ups etc.
-- ============================================================
create table if not exists public.pipeline_historico (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  lead_pipeline_id uuid references public.lead_pipeline(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  tipo_evento text not null,
  stage_origem_id uuid references public.pipeline_stages(id) on delete set null,
  stage_destino_id uuid references public.pipeline_stages(id) on delete set null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_pipeline_historico_org
  on public.pipeline_historico (organizacao_id);
create index if not exists idx_pipeline_historico_company
  on public.pipeline_historico (company_id);
create index if not exists idx_pipeline_historico_lead
  on public.pipeline_historico (lead_pipeline_id);
create index if not exists idx_pipeline_historico_criado
  on public.pipeline_historico (company_id, criado_em desc);

-- ============================================================
-- 4. Trigger para manter atualizado_em em lead_pipeline
-- ============================================================
create or replace function public._crm_atualizar_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_crm_lead_updated on public.lead_pipeline;
create trigger trg_crm_lead_updated
  before update on public.lead_pipeline
  for each row execute function public._crm_atualizar_lead();

-- ============================================================
-- 5. RLS
-- ============================================================
alter table public.pipeline_stages enable row level security;
alter table public.lead_pipeline enable row level security;
alter table public.pipeline_historico enable row level security;

-- pipeline_stages: leitura por membresia na org
drop policy if exists "crm_stages_select" on public.pipeline_stages;
create policy "crm_stages_select" on public.pipeline_stages
  for select to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- pipeline_stages: escrita apenas admin da org (configuração futuro)
drop policy if exists "crm_stages_insert_admin" on public.pipeline_stages;
create policy "crm_stages_insert_admin" on public.pipeline_stages
  for insert to authenticated
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id) and exists (
      select 1 from public.organizacao_membros m
      where m.organizacao_id = organizacao_id
        and m.usuario_id = auth.uid()
        and m.papel = 'admin'
        and m.status = 'ativo'
    )
  );

-- lead_pipeline: leitura/escrita por membresia na org
drop policy if exists "crm_lead_select" on public.lead_pipeline;
create policy "crm_lead_select" on public.lead_pipeline
  for select to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

drop policy if exists "crm_lead_insert" on public.lead_pipeline;
create policy "crm_lead_insert" on public.lead_pipeline
  for insert to authenticated
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

drop policy if exists "crm_lead_update" on public.lead_pipeline;
create policy "crm_lead_update" on public.lead_pipeline
  for update to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  )
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

drop policy if exists "crm_lead_delete" on public.lead_pipeline;
create policy "crm_lead_delete" on public.lead_pipeline
  for delete to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- pipeline_historico: leitura por membresia na org, escrita via API/definer
drop policy if exists "crm_historico_select" on public.pipeline_historico;
create policy "crm_historico_select" on public.pipeline_historico
  for select to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- ============================================================
-- 6. Função de seed dos estágios padrão (criar/recriar defaults de uma org)
--    Retorna os ids criados. É chamada pela API quando a org não tem
--    estágios (novas orgs) e usada no backfill abaixo (orgs existentes).
-- ============================================================
create or replace function public._crm_seed_estagios(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  estagios text[] := array[
    'NOVO','EM ABORDAGEM','CONTATO REALIZADO','FOLLOW-UP','RESPONDEU',
    'QUALIFICADO','REUNIÃO AGENDADA','OPORTUNIDADE','GANHO','PERDIDO'
  ];
  cores text[] := array[
    '#94a3b8','#3b82f6','#22c55e','#eab308','#06b6d4',
    '#8b5cf6','#f97316','#10b981','#16a34a','#ef4444'
  ];
  i integer;
begin
  for i in 1..array_length(estagios, 1) loop
    insert into public.pipeline_stages (organizacao_id, nome, ordem_estagio, cor)
    values (org_id, estagios[i], i, cores[i])
    on conflict (organizacao_id, nome) do nothing;
  end loop;
end;
$$;

-- ============================================================
-- 7. Backfill: cria estágios padrão para TODAS as orgs existentes
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select id from public.organizacoes
  loop
    perform public._crm_seed_estagios(r.id);
  end loop;
end;
$$;
