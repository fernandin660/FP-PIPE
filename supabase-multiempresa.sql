-- ============================================================
-- FP Pipe · Multi-empresa (equipes)
-- Cole este script inteiro no SQL Editor do Supabase e clique
-- em RUN. Nenhuma tabela antiga é removida — apenas colunas
-- e tabelas novas são adicionadas. Backfill cria uma org
-- automaticamente para cada usuário existente.
-- ============================================================

-- ============================================================
-- 1. TABELAS NOVAS
-- ============================================================

create table if not exists public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null default 'Minha Empresa',
  dono_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.organizacao_membros (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('admin','membro')) default 'admin',
  status text not null check (status in ('ativo','convite_pendente')) default 'ativo',
  email_convite text,
  criado_em timestamptz not null default now(),
  unique (organizacao_id, usuario_id)
);

create index if not exists idx_org_membros_usuario
  on public.organizacao_membros(usuario_id);

create index if not exists idx_org_membros_org
  on public.organizacao_membros(organizacao_id);

-- ============================================================
-- 2. COLUNA organisacao_id NAS TABELAS EXISTENTES
-- ============================================================

alter table public.creditos
  add column if not exists organizacao_id uuid;

alter table public.creditos_contatos
  add column if not exists organizacao_id uuid;

alter table public.creditos_ia
  add column if not exists organizacao_id uuid;

alter table public.uso_mensal
  add column if not exists organizacao_id uuid;

alter table public.listas
  add column if not exists organizacao_id uuid;

alter table public.companies
  add column if not exists organizacao_id uuid;

alter table public.icps
  add column if not exists organizacao_id uuid;

alter table public.assinaturas
  add column if not exists organizacao_id uuid;

alter table public.lista_empresas
  add column if not exists organizacao_id uuid;

-- Indices para consultas por org
create index if not exists idx_creditos_org
  on public.creditos(organizacao_id);
create index if not exists idx_creditos_contatos_org
  on public.creditos_contatos(organizacao_id);
create index if not exists idx_listas_org
  on public.listas(organizacao_id);
create index if not exists idx_companies_org
  on public.companies(organizacao_id);
create index if not exists idx_uso_mensal_org
  on public.uso_mensal(organizacao_id);
create index if not exists idx_icps_org
  on public.icps(organizacao_id);
create index if not exists idx_assinaturas_org
  on public.assinaturas(organizacao_id);

-- ============================================================
-- 3. UNIQUE CONSTRAINTS (1:1 por org nas tabelas de saldo)
-- ============================================================

-- Um saldo de buscas por organização
create unique index if not exists idx_creditos_org_uniq
  on public.creditos(organizacao_id)
  where organizacao_id is not null;

-- Um saldo de leads por organização
create unique index if not exists idx_creditos_contatos_org_uniq
  on public.creditos_contatos(organizacao_id)
  where organizacao_id is not null;

-- Um saldo de IA por organização
create unique index if not exists idx_creditos_ia_org_uniq
  on public.creditos_ia(organizacao_id)
  where organizacao_id is not null;

-- Uma assinatura por organização
create unique index if not exists idx_assinaturas_org_uniq
  on public.assinaturas(organizacao_id)
  where organizacao_id is not null;

-- Uso mensal único por org + mês
create unique index if not exists idx_uso_mensal_org_mes_uniq
  on public.uso_mensal(organizacao_id, mes)
  where organizacao_id is not null;

-- ============================================================
-- 4. FUNÇÃO DE MEMBRO (usada pelas políticas RLS)
-- ============================================================

create or replace function public._usuario_membro(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organizacao_membros m
    where m.organizacao_id = org_id
      and m.usuario_id = auth.uid()
      and m.status = 'ativo'
  )
$$;

-- ============================================================
-- 5. RLS: creditos, creditos_contatos, creditos_ia, uso_mensal
--    Agora leitura por membresia na organização.
-- ============================================================

-- Limpa políticas antigas (todas eram SELECT-only)
do $$
declare
  tabelas text[] := array[
    'creditos', 'creditos_contatos', 'creditos_ia', 'uso_mensal'
  ];
  t text;
  pol record;
begin
  foreach t in array tabelas loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        pol.policyname, t
      );
    end loop;
  end loop;
end $$;

-- SELECT por membresia na org
create policy "org_leitura_creditos" on public.creditos
  for select using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

create policy "org_leitura_creditos_contatos" on public.creditos_contatos
  for select using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

create policy "org_leitura_creditos_ia" on public.creditos_ia
  for select using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

create policy "org_leitura_uso_mensal" on public.uso_mensal
  for select using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- Escrita continua sendo service_role apenas (nada muda aqui).

-- ============================================================
-- 6. RLS: listas + lista_empresas + companies
--    DUAL: legado (usuario_id) + novo (organizacao_id).
-- ============================================================

-- Listas: manter policy antiga (compat) + adicionar org
drop policy if exists "Usuario gerencia suas listas" on public.listas;

create policy "listas_legado" on public.listas
  for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "listas_org" on public.listas
  for all to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  )
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- lista_empresas: manter + adicionar org
drop policy if exists "Usuario gerencia vinculos das listas" on public.lista_empresas;

create policy "lista_empresas_legado" on public.lista_empresas
  for all to authenticated
  using (
    exists (
      select 1 from public.listas l
      where l.id = lista_id and l.usuario_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listas l
      where l.id = lista_id and l.usuario_id = auth.uid()
    )
  );

create policy "lista_empresas_org" on public.lista_empresas
  for all to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  )
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- Companies: manter + adicionar org
drop policy if exists "Usuario gerencia suas empresas" on public.companies;

create policy "companies_legado" on public.companies
  for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "companies_org" on public.companies
  for all to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  )
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- ============================================================
-- 7. RLS: icps + assinaturas (org)
-- ============================================================

-- ICPs: manter legado + adicionar org
drop policy if exists "Usuario acessa apenas seus ICPs" on public.icps;

create policy "icps_legado" on public.icps
  for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "icps_org" on public.icps
  for all to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  )
  with check (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- Assinaturas: manter legado SELECT + adicionar org
create policy "assinaturas_org_select" on public.assinaturas
  for select to authenticated
  using (
    organizacao_id is not null and public._usuario_membro(organizacao_id)
  );

-- ============================================================
-- 8. RLS: organizacoes + organizacao_membros
-- ============================================================

alter table public.organizacoes enable row level security;
alter table public.organizacao_membros enable row level security;

-- Usuário vê a organização onde é membro
create policy "org_select_membros" on public.organizacoes
  for select to authenticated
  using (public._usuario_membro(id));

-- Admin pode alterar dados da org (nome)
create policy "org_update_admin" on public.organizacoes
  for update to authenticated
  using (
    public._usuario_membro(id) and exists (
      select 1 from public.organizacao_membros m
      where m.organizacao_id = id
        and m.usuario_id = auth.uid()
        and m.papel = 'admin'
        and m.status = 'ativo'
    )
  )
  with check (
    public._usuario_membro(id) and exists (
      select 1 from public.organizacao_membros m
      where m.organizacao_id = id
        and m.usuario_id = auth.uid()
        and m.papel = 'admin'
        and m.status = 'ativo'
    )
  );

-- Membro vê os colegas da mesma organização
create policy "membros_select" on public.organizacao_membros
  for select to authenticated
  using (public._usuario_membro(organizacao_id));

-- Admin pode inserir/remover membros
create policy "membros_insert_admin" on public.organizacao_membros
  for insert to authenticated
  with check (
    public._usuario_membro(organizacao_id) and exists (
      select 1 from public.organizacao_membros m
      where m.organizacao_id = organizacao_id
        and m.usuario_id = auth.uid()
        and m.papel = 'admin'
        and m.status = 'ativo'
    )
  );

create policy "membros_delete_admin" on public.organizacao_membros
  for delete to authenticated
  using (
    public._usuario_membro(organizacao_id) and exists (
      select 1 from public.organizacao_membros m
      where m.organizacao_id = organizacao_id
        and m.usuario_id = auth.uid()
        and m.papel = 'admin'
        and m.status = 'ativo'
    )
  );

create policy "membros_update_admin" on public.organizacao_membros
  for update to authenticated
  using (
    public._usuario_membro(organizacao_id) and exists (
      select 1 from public.organizacao_membros m
      where m.organizacao_id = organizacao_id
        and m.usuario_id = auth.uid()
        and m.papel = 'admin'
        and m.status = 'ativo'
    )
  );

-- ============================================================
-- 9. TRIGGER ATUALIZADO: novo usuário nasce com org
-- ============================================================

create or replace function public.preparar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_org_id uuid;
begin
  -- Cria organização do novo usuário
  insert into public.organizacoes (nome, dono_id)
  values ('Minha Empresa', new.id)
  returning id into nova_org_id;

  -- Insere o usuário como admin da organização
  insert into public.organizacao_membros (organizacao_id, usuario_id, papel, status)
  values (nova_org_id, new.id, 'admin', 'ativo');

  -- Cria assinatura teste vinculada à org
  insert into public.assinaturas (usuario_id, plano, status, origem, organizacao_id)
  values (new.id, 'teste', 'ativa', 'signup', nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  -- Cria saldos vinculados à org
  insert into public.creditos_contatos (usuario_id, saldo, organizacao_id)
  values (new.id, 5, nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  insert into public.creditos (usuario_id, saldo, organizacao_id)
  values (new.id, 2, nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  insert into public.creditos_ia (usuario_id, saldo, organizacao_id)
  values (new.id, 2, nova_org_id)
  on conflict (usuario_id) do update
    set organizacao_id = nova_org_id;

  return new;
end;
$$;

-- ============================================================
-- 10. BACKFILL: cria org para cada usuário existente
-- ============================================================

-- Cria org para cada usuário que ainda não tem
insert into public.organizacoes (nome, dono_id)
select 'Minha Empresa', id
from auth.users u
where not exists (
  select 1 from public.organizacao_membros m
  where m.usuario_id = u.id
);

-- Insere cada usuário como admin da sua org
insert into public.organizacao_membros (organizacao_id, usuario_id, papel, status)
select o.id, o.dono_id, 'admin', 'ativo'
from public.organizacoes o
where not exists (
  select 1 from public.organizacao_membros m
  where m.usuario_id = o.dono_id
);

-- Vincula creditos existentes à org
update public.creditos c
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = c.usuario_id
  and c.organizacao_id is null;

update public.creditos_contatos cc
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = cc.usuario_id
  and cc.organizacao_id is null;

update public.creditos_ia ci
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = ci.usuario_id
  and ci.organizacao_id is null;

update public.assinaturas a
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = a.usuario_id
  and a.organizacao_id is null;

update public.listas l
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = l.usuario_id
  and l.organizacao_id is null;

update public.companies comp
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = comp.usuario_id
  and comp.organizacao_id is null;

update public.icps i
set organizacao_id = m.organizacao_id
from public.organizacao_membros m
where m.usuario_id = i.usuario_id
  and i.organizacao_id is null;

-- lista_empresas: herda da lista-pai
update public.lista_empresas le
set organizacao_id = l.organizacao_id
from public.listas l
where l.id = le.lista_id
  and le.organizacao_id is null
  and l.organizacao_id is not null;

-- ============================================================
-- 11. VIEW DE DIAGNÓSTICO (opcional, útil para debug)
-- ============================================================

create or replace view public._org_diagnostico as
select
  o.id as org_id,
  o.nome as org_nome,
  o.dono_id,
  count(m.id) as total_membros,
  (select count(*) from public.listas l where l.organizacao_id = o.id) as total_listas,
  (select count(*) from public.companies c where c.organizacao_id = o.id) as total_empresas
from public.organizacoes o
left join public.organizacao_membros m on m.organizacao_id = o.id
group by o.id, o.nome, o.dono_id;

-- ============================================================
-- FIM. Agora rode as rotas do servidor com ctx.orgId e tudo
-- vai funcionar transparentemente.
-- ============================================================
