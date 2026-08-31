-- ============================================================
-- FP Pipe · CRM — Fase 2 (histórico editável + cadência)
--
-- Rode este script inteiro no Supabase > SQL Editor > New query.
-- Idempotente (IF NOT EXISTS / add column if not exists).
--
-- Sobre a Fase 1 (já aplicada):
--   • pipeline_historico já tem `dados jsonb` — usado para armazenar
--     atividades manuais editáveis (tipo, observação, data/hora).
--   • Adicionamos policy de INSERT e UPDATE para membros (a Fase 1 só
--     tinha SELECT; a escrita era via servidor).
--
-- Novas entidades:
--   • cadencia            — modelo de cadência por organização
--   • cadencia_etapas     — passos do modelo (tipo, titulo, atraso, script)
--   • lead_cadencia       — um lead rodando numa cadência (com próxima etapa)
-- ============================================================

-- ============================================================
-- 1. Policies de escrita por membro no pipeline_historico
--    (permite registrar/editar atividades manuais do lead)
-- ============================================================
drop policy if exists "crm_historico_insert" on public.pipeline_historico;
create policy "crm_historico_insert" on public.pipeline_historico
  for insert to authenticated
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

drop policy if exists "crm_historico_update" on public.pipeline_historico;
create policy "crm_historico_update" on public.pipeline_historico
  for update to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  )
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- ============================================================
-- 2. cadencia — modelo de cadência por organização
-- ============================================================
create table if not exists public.cadencia (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  nome text not null,
  descricao text not null default '',
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (organizacao_id, nome)
);

create index if not exists idx_cadencia_org on public.cadencia (organizacao_id);

-- ============================================================
-- 3. cadencia_etapas — passos ordenados do modelo
-- ============================================================
create table if not exists public.cadencia_etapas (
  id uuid primary key default gen_random_uuid(),
  cadencia_id uuid not null references public.cadencia(id) on delete cascade,
  ordem integer not null default 0,
  tipo_atividade text not null default 'tarefa',
  titulo text not null,
  atraso_dias integer not null default 0,
  script text not null default '',
  criado_em timestamptz not null default now(),
  unique (cadencia_id, ordem)
);

create index if not exists idx_cadencia_etapas_cad on public.cadencia_etapas (cadencia_id, ordem);

-- ============================================================
-- 4. lead_cadencia — lead rodando numa cadência
-- ============================================================
create table if not exists public.lead_cadencia (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  lead_pipeline_id uuid not null references public.lead_pipeline(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  cadencia_id uuid not null references public.cadencia(id) on delete cascade,
  etapa_atual_id uuid references public.cadencia_etapas(id) on delete set null,
  proxima_em timestamptz,
  status text not null default 'ativa',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organizacao_id, lead_pipeline_id)
);

create index if not exists idx_lead_cadencia_org on public.lead_cadencia (organizacao_id);
create index if not exists idx_lead_cadencia_lead on public.lead_cadencia (lead_pipeline_id);
create index if not exists idx_lead_cadencia_status on public.lead_cadencia (status);

-- ============================================================
-- 5. RLS nas novas tabelas
-- ============================================================
alter table public.cadencia enable row level security;
alter table public.cadencia_etapas enable row level security;
alter table public.lead_cadencia enable row level security;

-- cadencia: leitura/escrita por membresia na org
drop policy if exists "cadencia_select" on public.cadencia;
create policy "cadencia_select" on public.cadencia
  for select to authenticated
  using (organizacao_id is not null and public._usuario_membro(organizacao_id));

drop policy if exists "cadencia_insert" on public.cadencia;
create policy "cadencia_insert" on public.cadencia
  for insert to authenticated
  with check (organizacao_id is not null and public._usuario_membro(organizacao_id));

drop policy if exists "cadencia_update" on public.cadencia;
create policy "cadencia_update" on public.cadencia
  for update to authenticated
  using (organizacao_id is not null and public._usuario_membro(organizacao_id))
  with check (organizacao_id is not null and public._usuario_membro(organizacao_id));

drop policy if exists "cadencia_delete" on public.cadencia;
create policy "cadencia_delete" on public.cadencia
  for delete to authenticated
  using (organizacao_id is not null and public._usuario_membro(organizacao_id));

-- cadencia_etapas: leitura/escrita por membresia
drop policy if exists "cadencia_etapas_select" on public.cadencia_etapas;
create policy "cadencia_etapas_select" on public.cadencia_etapas
  for select to authenticated
  using (
    exists (
      select 1 from public.cadencia c
      where c.id = cadencia_id and public._usuario_membro(c.organizacao_id)
    )
  );

drop policy if exists "cadencia_etapas_insert" on public.cadencia_etapas;
create policy "cadencia_etapas_insert" on public.cadencia_etapas
  for insert to authenticated
  with check (
    exists (
      select 1 from public.cadencia c
      where c.id = cadencia_id and public._usuario_membro(c.organizacao_id)
    )
  );

drop policy if exists "cadencia_etapas_update" on public.cadencia_etapas;
create policy "cadencia_etapas_update" on public.cadencia_etapas
  for update to authenticated
  using (
    exists (
      select 1 from public.cadencia c
      where c.id = cadencia_id and public._usuario_membro(c.organizacao_id)
    )
  )
  with check (
    exists (
      select 1 from public.cadencia c
      where c.id = cadencia_id and public._usuario_membro(c.organizacao_id)
    )
  );

drop policy if exists "cadencia_etapas_delete" on public.cadencia_etapas;
create policy "cadencia_etapas_delete" on public.cadencia_etapas
  for delete to authenticated
  using (
    exists (
      select 1 from public.cadencia c
      where c.id = cadencia_id and public._usuario_membro(c.organizacao_id)
    )
  );

-- lead_cadencia: leitura/escrita por membresia
drop policy if exists "lead_cadencia_select" on public.lead_cadencia;
create policy "lead_cadencia_select" on public.lead_cadencia
  for select to authenticated
  using (organizacao_id is not null and public._usuario_membro(organizacao_id));

drop policy if exists "lead_cadencia_insert" on public.lead_cadencia;
create policy "lead_cadencia_insert" on public.lead_cadencia
  for insert to authenticated
  with check (organizacao_id is not null and public._usuario_membro(organizacao_id));

drop policy if exists "lead_cadencia_update" on public.lead_cadencia;
create policy "lead_cadencia_update" on public.lead_cadencia
  for update to authenticated
  using (organizacao_id is not null and public._usuario_membro(organizacao_id))
  with check (organizacao_id is not null and public._usuario_membro(organizacao_id));

drop policy if exists "lead_cadencia_delete" on public.lead_cadencia;
create policy "lead_cadencia_delete" on public.lead_cadencia
  for delete to authenticated
  using (organizacao_id is not null and public._usuario_membro(organizacao_id));

-- ============================================================
-- 6. Cadência padrão por organização (backfill + helper)
-- ============================================================
create or replace function public._crm_seed_cadencia_padrao(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cad_id uuid;
begin
  -- Não duplica se a org já tem o modelo padrão.
  if exists (
    select 1 from public.cadencia where organizacao_id = org_id and nome = 'Padrão 5 toques'
  ) then
    return;
  end if;

  insert into public.cadencia (organizacao_id, nome, descricao)
  values (org_id, 'Padrão 5 toques', 'Abordagem: e-mail de apresentação, follow-ups e encerramento por telefone/LinkedIn.')
  returning id into cad_id;

  insert into public.cadencia_etapas (cadencia_id, ordem, tipo_atividade, titulo, atraso_dias, script) values
    (cad_id, 0, 'email',    'E-mail de apresentação',                 0,  'Apresente a proposta de valor e peça agendamento de 15 min.'),
    (cad_id, 1, 'linkedin', 'Conexão e mensagem no LinkedIn',         2,  'Conecte-se no LinkedIn e envie mensagem curta reforçando o e-mail.'),
    (cad_id, 2, 'telefone', 'Ligação de follow-up',                   4,  'Ligue para reforçar o pedido de reunião e tirar dúvidas.'),
    (cad_id, 3, 'email',    'Follow-up de valor',                     7,  'Envie conteúdo/caso de uso relevante para o decisor.'),
    (cad_id, 4, 'tarefa',   'Encerramento / última chamada',          10, 'Último contato; se não houver resposta, mover para encerramento.');
end;
$$;

do $$
declare
  r record;
begin
  for r in select id from public.organizacoes loop
    perform public._crm_seed_cadencia_padrao(r.id);
  end loop;
end;
$$;
