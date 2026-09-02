-- ============================================================
-- FP Pipe · Company Intelligence — Fase 2
--
-- Rode este script inteiro no Supabase > SQL Editor > New query.
--
-- Adiciona, SOBRE a arquitetura existente, SEM alterar o fluxo de
-- busca/enriquecimento/scoring/e-mail e SEM duplicar entidades:
--
--   • companies.interpretacao_ia    — interpretação comercial (real, via IA)
--   • company_sinais                — sinais comerciais (estrutura extensível,
--                                     alimentada por ação manual/registros;
--                                     NUNCA simulamos dados inexistentes)
--
-- Padrão idempotente (IF NOT EXISTS + add column if not exists).
-- ============================================================

-- 1. companies.interpretacao_ia
alter table public.companies add column if not exists interpretacao_ia text;

-- 1b. Colunas do aprovador (usadas por /api/crm e /api/crm/intelligence).
--     Sem elas o SELECT do CRM falha e as empresas aparecem como "indisponíveis".
alter table public.companies add column if not exists aprovador_nome text;
alter table public.companies add column if not exists aprovador_cargo text;

-- ============================================================
-- 2. company_sinais — sinais comerciais por empresa
--    tipo        : ex. 'contratacao', 'expansao', 'nova_filial', 'mudanca_lideranca',
--                  'novo_decisor', 'tecnologia', 'crescimento', 'evento', 'outro'
--    descricao   : descrição objetiva do sinal (real, preenchida por quem registra)
--    data        : data em que o evento ocorreu (real)
--    fonte       : origem do dado (ex. 'manual', 'linkedin', 'noticia')
--    confianca   : 0-100 (quão certo é o dado)
--    relevancia  : 0-100 (impacto comercial)
-- ============================================================
create table if not exists public.company_sinais (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tipo text not null default 'outro',
  descricao text not null default '',
  data date,
  fonte text not null default 'manual',
  confianca integer not null default 50,
  relevancia integer not null default 50,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_company_sinais_org
  on public.company_sinais (organizacao_id);
create index if not exists idx_company_sinais_company
  on public.company_sinais (company_id, criado_em desc);

-- ============================================================
-- 3. RLS
-- ============================================================
alter table public.company_sinais enable row level security;

-- Leitura por membresia na org
drop policy if exists "company_sinais_select" on public.company_sinais;
create policy "company_sinais_select" on public.company_sinais
  for select to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- Inserção por membresia na org
drop policy if exists "company_sinais_insert" on public.company_sinais;
create policy "company_sinais_insert" on public.company_sinais
  for insert to authenticated
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- Edição por membresia na org
drop policy if exists "company_sinais_update" on public.company_sinais;
create policy "company_sinais_update" on public.company_sinais
  for update to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  )
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- Remoção por membresia na org
drop policy if exists "company_sinais_delete" on public.company_sinais;
create policy "company_sinais_delete" on public.company_sinais
  for delete to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );
