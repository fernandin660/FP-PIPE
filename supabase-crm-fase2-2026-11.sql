-- CRM fase 2: filtros salvos (visões de lista) e caixa de entrada de leads.
-- Migração aditiva: não altera tabelas existentes.

-- Filtros salvos ---------------------------------------------------------
create table if not exists public.crm_filtros (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  usuario_id uuid not null default auth.uid(),
  entidade text not null default 'negocio' check (entidade in ('negocio', 'lead')),
  nome text not null check (char_length(nome) between 1 and 80),
  filtros jsonb not null default '{}'::jsonb,
  colunas jsonb not null default '[]'::jsonb,
  compartilhado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists crm_filtros_org_idx on public.crm_filtros (organizacao_id, entidade);
alter table public.crm_filtros enable row level security;

create policy "crm_filtros_select" on public.crm_filtros for select
  using (public._usuario_membro(organizacao_id) and (compartilhado or usuario_id = auth.uid()));
create policy "crm_filtros_insert" on public.crm_filtros for insert
  with check (public._usuario_membro(organizacao_id) and usuario_id = auth.uid());
create policy "crm_filtros_update" on public.crm_filtros for update
  using (usuario_id = auth.uid() or public._usuario_admin(organizacao_id))
  with check (public._usuario_membro(organizacao_id));
create policy "crm_filtros_delete" on public.crm_filtros for delete
  using (usuario_id = auth.uid() or public._usuario_admin(organizacao_id));

-- Caixa de entrada de leads ---------------------------------------------
create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 200),
  company_id uuid references public.companies(id) on delete set null,
  pessoa_id uuid references public.contatos(id) on delete set null,
  responsavel_id uuid,
  valor numeric(14, 2),
  origem text not null default 'manual',
  etiqueta text check (etiqueta in ('quente', 'morno', 'frio')),
  observacao text,
  status text not null default 'aberto' check (status in ('aberto', 'arquivado', 'convertido')),
  negocio_id uuid references public.lead_pipeline(id) on delete set null,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists crm_leads_org_status_idx on public.crm_leads (organizacao_id, status, criado_em desc);
create index if not exists crm_leads_company_idx on public.crm_leads (company_id);
create index if not exists crm_leads_pessoa_idx on public.crm_leads (pessoa_id);
create index if not exists crm_leads_negocio_idx on public.crm_leads (negocio_id);
alter table public.crm_leads enable row level security;

create policy "crm_leads_select" on public.crm_leads for select
  using (public._usuario_membro(organizacao_id));
create policy "crm_leads_insert" on public.crm_leads for insert
  with check (public._usuario_membro(organizacao_id));
create policy "crm_leads_update" on public.crm_leads for update
  using (public._usuario_membro(organizacao_id)) with check (public._usuario_membro(organizacao_id));
create policy "crm_leads_delete_admin" on public.crm_leads for delete
  using (public._usuario_admin(organizacao_id));
