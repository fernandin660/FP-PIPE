-- CRM fase 1 (2026-11-11): vários funis, negócios com título e pessoa,
-- pessoas e organizações editáveis e campos personalizados.
-- Migração aditiva: o app antigo continua funcionando (etapas sem funil
-- caem no funil padrão; negócios herdam o funil da etapa).
-- Cópia de segurança em backup_20261111 (migration backup_crm_antes_fase1).

-- 1) Funis --------------------------------------------------------------
create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (organizacao_id, nome)
);
create index if not exists idx_pipelines_org on public.pipelines (organizacao_id, ordem);
alter table public.pipelines enable row level security;

drop policy if exists "crm_pipelines_select" on public.pipelines;
create policy "crm_pipelines_select" on public.pipelines for select
  using (public._usuario_membro(organizacao_id));
drop policy if exists "crm_pipelines_insert_admin" on public.pipelines;
create policy "crm_pipelines_insert_admin" on public.pipelines for insert
  with check (public._usuario_admin(organizacao_id));
drop policy if exists "crm_pipelines_update_admin" on public.pipelines;
create policy "crm_pipelines_update_admin" on public.pipelines for update
  using (public._usuario_admin(organizacao_id)) with check (public._usuario_admin(organizacao_id));
drop policy if exists "crm_pipelines_delete_admin" on public.pipelines;
create policy "crm_pipelines_delete_admin" on public.pipelines for delete
  using (public._usuario_admin(organizacao_id));

-- Funil padrão de cada organização (cria se não existir).
create or replace function public._crm_funil_padrao(org_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.pipelines
   where organizacao_id = org_id order by ordem, criado_em limit 1;
  if v_id is null then
    insert into public.pipelines (organizacao_id, nome, ordem)
    values (org_id, 'Prospecção', 0)
    on conflict (organizacao_id, nome) do update set nome = excluded.nome
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public._crm_funil_padrao(uuid) from public, anon, authenticated;

-- Etapas pertencem a um funil.
alter table public.pipeline_stages add column if not exists pipeline_id uuid
  references public.pipelines(id) on delete cascade;

create or replace function public._crm_etapa_funil()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.pipeline_id is null then
    new.pipeline_id := public._crm_funil_padrao(new.organizacao_id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_crm_etapa_funil on public.pipeline_stages;
create trigger trg_crm_etapa_funil before insert on public.pipeline_stages
  for each row execute function public._crm_etapa_funil();

update public.pipeline_stages s
   set pipeline_id = public._crm_funil_padrao(s.organizacao_id)
 where s.pipeline_id is null;
alter table public.pipeline_stages alter column pipeline_id set not null;

-- Nome da etapa é único dentro do funil (não mais na organização inteira).
alter table public.pipeline_stages drop constraint if exists pipeline_stages_organizacao_id_nome_key;
create unique index if not exists pipeline_stages_funil_nome_key on public.pipeline_stages (pipeline_id, nome);
create index if not exists idx_pipeline_stages_funil on public.pipeline_stages (pipeline_id, ordem_estagio);

drop policy if exists "crm_stages_delete_admin" on public.pipeline_stages;
create policy "crm_stages_delete_admin" on public.pipeline_stages for delete
  using (organizacao_id is not null and public._usuario_admin(organizacao_id));

-- Etapas padrão: agora cria dentro do funil padrão.
create or replace function public._crm_seed_estagios(org_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
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
  probs smallint[] := array[5,10,15,20,30,40,50,70,100,0];
  v_funil uuid;
  i integer;
begin
  if auth.uid() is not null and not public._usuario_membro(org_id) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  v_funil := public._crm_funil_padrao(org_id);
  for i in 1..array_length(estagios, 1) loop
    insert into public.pipeline_stages (organizacao_id, pipeline_id, nome, ordem_estagio, cor, probabilidade)
    values (org_id, v_funil, estagios[i], i, cores[i], probs[i])
    on conflict (pipeline_id, nome) do nothing;
  end loop;
end;
$$;

-- 2) Negócios (lead_pipeline) -------------------------------------------
alter table public.lead_pipeline add column if not exists pipeline_id uuid
  references public.pipelines(id) on delete cascade;
alter table public.lead_pipeline add column if not exists titulo text
  check (titulo is null or char_length(titulo) <= 160);
alter table public.lead_pipeline add column if not exists pessoa_id uuid
  references public.contatos(id) on delete set null;
alter table public.lead_pipeline add column if not exists data_prevista date;
alter table public.lead_pipeline add column if not exists campos jsonb not null default '{}'::jsonb;

-- O funil do negócio é sempre o da etapa (mantido pelo banco).
create or replace function public._crm_negocio_funil()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_funil uuid;
  v_org uuid;
begin
  select pipeline_id, organizacao_id into v_funil, v_org
    from public.pipeline_stages where id = new.stage_id;
  if v_funil is null or v_org is distinct from new.organizacao_id then
    raise exception 'Etapa inválida para esta organização' using errcode = '23514';
  end if;
  new.pipeline_id := v_funil;
  return new;
end;
$$;
drop trigger if exists trg_crm_negocio_funil on public.lead_pipeline;
create trigger trg_crm_negocio_funil before insert or update of stage_id, organizacao_id on public.lead_pipeline
  for each row execute function public._crm_negocio_funil();

update public.lead_pipeline l
   set pipeline_id = s.pipeline_id
  from public.pipeline_stages s
 where s.id = l.stage_id and l.pipeline_id is null;
alter table public.lead_pipeline alter column pipeline_id set not null;

-- Uma empresa pode ter um negócio em cada funil.
alter table public.lead_pipeline drop constraint if exists lead_pipeline_organizacao_id_company_id_key;
create unique index if not exists lead_pipeline_org_empresa_funil_key
  on public.lead_pipeline (organizacao_id, company_id, pipeline_id);
create index if not exists idx_lead_pipeline_funil on public.lead_pipeline (pipeline_id, stage_id, ordenacao);
create index if not exists idx_lead_pipeline_pessoa on public.lead_pipeline (pessoa_id);

-- 3) Pessoas e organizações ---------------------------------------------
alter table public.contatos add column if not exists telefone text;
alter table public.contatos add column if not exists observacoes text;
alter table public.contatos add column if not exists campos jsonb not null default '{}'::jsonb;
alter table public.contatos add column if not exists atualizado_em timestamptz not null default now();
alter table public.companies add column if not exists campos jsonb not null default '{}'::jsonb;
create index if not exists idx_contatos_org_nome on public.contatos (organizacao_id, nome);

-- 4) Campos personalizados ---------------------------------------------
create table if not exists public.crm_campos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  entidade text not null check (entidade in ('negocio', 'organizacao', 'pessoa')),
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  tipo text not null check (tipo in ('texto', 'texto_longo', 'numero', 'moeda', 'data', 'opcao', 'telefone', 'email', 'url')),
  opcoes text[] not null default '{}',
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (organizacao_id, entidade, nome)
);
create index if not exists idx_crm_campos_org on public.crm_campos (organizacao_id, entidade, ordem);
alter table public.crm_campos enable row level security;

drop policy if exists "crm_campos_select" on public.crm_campos;
create policy "crm_campos_select" on public.crm_campos for select
  using (public._usuario_membro(organizacao_id));
drop policy if exists "crm_campos_insert_admin" on public.crm_campos;
create policy "crm_campos_insert_admin" on public.crm_campos for insert
  with check (public._usuario_admin(organizacao_id));
drop policy if exists "crm_campos_update_admin" on public.crm_campos;
create policy "crm_campos_update_admin" on public.crm_campos for update
  using (public._usuario_admin(organizacao_id)) with check (public._usuario_admin(organizacao_id));
drop policy if exists "crm_campos_delete_admin" on public.crm_campos;
create policy "crm_campos_delete_admin" on public.crm_campos for delete
  using (public._usuario_admin(organizacao_id));

-- Funções de gatilho são internas (migration crm_fase1_revoga_gatilhos).
revoke all on function public._crm_etapa_funil() from public, anon, authenticated;
revoke all on function public._crm_negocio_funil() from public, anon, authenticated;
