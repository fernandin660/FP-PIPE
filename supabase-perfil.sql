-- ============================================================
-- FP Pipe · Perfil do vendedor (empresa que usa a plataforma)
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.perfil (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references auth.users(id) on delete cascade,
  nome_empresa text,
  area_atuacao text,
  produtos_servicos text,
  foto_url text,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

alter table public.perfil enable row level security;

drop policy if exists "Dono gerencia o proprio perfil" on public.perfil;
create policy "Dono gerencia o proprio perfil"
  on public.perfil for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- ============================================================
-- Storage para a foto/logo da empresa
-- ============================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "Upload de logos autenticado" on storage.objects;
create policy "Upload de logos autenticado"
  on storage.objects for insert
  with check (bucket_id = 'logos');

drop policy if exists "Leitura publica de logos" on storage.objects;
create policy "Leitura publica de logos"
  on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "Atualizacao de logos autenticada" on storage.objects;
create policy "Atualizacao de logos autenticada"
  on storage.objects for update
  using (bucket_id = 'logos');

drop policy if exists "Remocao de logos autenticada" on storage.objects;
create policy "Remocao de logos autenticada"
  on storage.objects for delete
  using (bucket_id = 'logos');
