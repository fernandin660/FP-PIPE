-- FP Pipe - cota diária de e-mails aceitos pelos provedores.

create table if not exists public.uso_envios_email (
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  data date not null default current_date,
  enviados integer not null default 0,
  entregues integer not null default 0,
  falhas integer not null default 0,
  bounces integer not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (organizacao_id, usuario_id, data)
);

alter table public.uso_envios_email enable row level security;

drop policy if exists "Usuario ve seu uso de email" on public.uso_envios_email;
create policy "Usuario ve seu uso de email"
  on public.uso_envios_email for select to authenticated
  using (auth.uid() = usuario_id);

create index if not exists uso_envios_email_data_idx
  on public.uso_envios_email (organizacao_id, data);
