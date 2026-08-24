-- ============================================================
-- FP Pipe -- Uso mensal por usuario (contador de empresas)
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.uso_mensal (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  mes text not null,
  empresas_geradas integer not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, mes)
);

alter table public.uso_mensal enable row level security;

create policy "Usuario ve o proprio uso"
  on public.uso_mensal for select
  to authenticated
  using (auth.uid() = usuario_id);

create policy "Usuario insere o proprio uso"
  on public.uso_mensal for insert
  to authenticated
  with check (auth.uid() = usuario_id);

create policy "Usuario atualiza o proprio uso"
  on public.uso_mensal for update
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
