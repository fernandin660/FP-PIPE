-- CRM fase 3: metas da equipe e por pessoa (relatórios). Migração aditiva.
create table if not exists public.crm_metas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  usuario_id uuid,                -- null = meta da equipe inteira
  pipeline_id uuid references public.pipelines(id) on delete cascade, -- null = todos os funis
  tipo text not null check (tipo in ('valor_ganho', 'negocios_ganhos', 'negocios_criados', 'atividades_concluidas')),
  periodo text not null default 'mes' check (periodo in ('mes', 'trimestre')),
  alvo numeric(14, 2) not null check (alvo > 0),
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists crm_metas_org_idx on public.crm_metas (organizacao_id);
create index if not exists crm_metas_pipeline_idx on public.crm_metas (pipeline_id);
alter table public.crm_metas enable row level security;
create policy "crm_metas_select" on public.crm_metas for select using (public._usuario_membro(organizacao_id));
create policy "crm_metas_insert_admin" on public.crm_metas for insert with check (public._usuario_admin(organizacao_id));
create policy "crm_metas_update_admin" on public.crm_metas for update using (public._usuario_admin(organizacao_id)) with check (public._usuario_admin(organizacao_id));
create policy "crm_metas_delete_admin" on public.crm_metas for delete using (public._usuario_admin(organizacao_id));
