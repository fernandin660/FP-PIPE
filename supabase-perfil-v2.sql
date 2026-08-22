-- ============================================================
-- FP Pipe · Perfil v2: Site + Anexos de portfólio
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

alter table public.perfil add column if not exists site text;
alter table public.perfil add column if not exists anexos jsonb default '[]'::jsonb;

-- Bucket para portfólios (PDFs e imagens)
insert into storage.buckets (id, name, public)
values ('portfolios', 'portfolios', true)
on conflict (id) do nothing;

drop policy if exists "Upload de portfolios autenticado" on storage.objects;
create policy "Upload de portfolios autenticado"
  on storage.objects for insert
  with check (bucket_id = 'portfolios');

drop policy if exists "Leitura publica de portfolios" on storage.objects;
create policy "Leitura publica de portfolios"
  on storage.objects for select
  using (bucket_id = 'portfolios');

drop policy if exists "Atualizacao de portfolios autenticada" on storage.objects;
create policy "Atualizacao de portfolios autenticada"
  on storage.objects for update
  using (bucket_id = 'portfolios');

drop policy if exists "Remocao de portfolios autenticada" on storage.objects;
create policy "Remocao de portfolios autenticada"
  on storage.objects for delete
  using (bucket_id = 'portfolios');
