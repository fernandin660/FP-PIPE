-- ============================================================
-- FP Pipe -- Assinaturas e plano automatico no cadastro
-- Rode este script inteiro no Supabase > SQL Editor > New query
-- ============================================================

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references auth.users(id) on delete cascade,
  plano text not null default 'teste',
  status text not null default 'ativa',
  ciclo text,
  origem text not null default 'signup',
  mp_preference_id text,
  mp_payment_id text,
  inicio timestamptz not null default now(),
  renova_em timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.assinaturas enable row level security;

create policy "Usuario le a propria assinatura"
  on public.assinaturas for select
  to authenticated
  using (auth.uid() = usuario_id);

-- Escrita fica por conta da service role (webhook/admin).

-- ------------------------------------------------------------
-- Novo usuario nasce com plano teste + creditos de boas-vindas
-- ------------------------------------------------------------
create or replace function public.preparar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.assinaturas (usuario_id, plano, status, origem)
  values (new.id, 'teste', 'ativa', 'signup')
  on conflict (usuario_id) do nothing;

  insert into public.creditos_contatos (usuario_id, saldo)
  values (new.id, 5)
  on conflict (usuario_id) do nothing;

  insert into public.creditos (usuario_id, saldo)
  values (new.id, 2)
  on conflict (usuario_id) do nothing;

  insert into public.creditos_ia (usuario_id, saldo)
  values (new.id, 2)
  on conflict (usuario_id) do nothing;

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.preparar_novo_usuario();

-- Usuarios que ja existem antes do trigger ganham o mesmo pacote:
insert into public.assinaturas (usuario_id, plano, status, origem)
select id, 'teste', 'ativa', 'signup' from auth.users
on conflict (usuario_id) do nothing;

insert into public.creditos_contatos (usuario_id, saldo)
select id, 5 from auth.users
where not exists (select 1 from public.creditos_contatos c where c.usuario_id = users.id);

insert into public.creditos (usuario_id, saldo)
select id, 2 from auth.users
where not exists (select 1 from public.creditos c where c.usuario_id = users.id);

insert into public.creditos_ia (usuario_id, saldo)
select id, 2 from auth.users
where not exists (select 1 from public.creditos_ia c where c.usuario_id = users.id);
