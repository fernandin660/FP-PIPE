-- ============================================================
-- FP Pipe · Minhas Listas
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.listas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  segmentos text[] default '{}',
  localizacao text,
  criado_em timestamptz not null default now()
);

alter table public.listas enable row level security;

drop policy if exists "Usuario gerencia suas listas" on public.listas;
create policy "Usuario gerencia suas listas"
  on public.listas for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- Vínculo lista <-> empresa (uma empresa pode estar em várias listas)
create table if not exists public.lista_empresas (
  lista_id uuid not null references public.listas(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  primary key (lista_id, company_id)
);

alter table public.lista_empresas enable row level security;

drop policy if exists "Usuario gerencia vinculos das listas" on public.lista_empresas;
create policy "Usuario gerencia vinculos das listas"
  on public.lista_empresas for all
  to authenticated
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
