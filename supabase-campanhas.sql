-- FP Pipe - campanhas de e-mail por lista.
-- Execute no SQL Editor depois das migrations de listas e equipes.

create table if not exists public.campanhas (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  lista_id uuid not null references public.listas(id) on delete cascade,
  nome text not null,
  assunto text,
  corpo text,
  objetivo text not null default 'gerar_interesse',
  geracoes_usadas integer not null default 0 check (geracoes_usadas >= 0),
  status text not null default 'rascunho' check (status in ('rascunho','pronta','enviando','enviada','cancelada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (lista_id)
);

create table if not exists public.campanha_destinatarios (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  campanha_id uuid not null references public.campanhas(id) on delete cascade,
  contato_id uuid references public.contatos(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  email text not null,
  nome text,
  empresa text,
  cargo text,
  status text not null default 'nao_contatado' check (status in ('nao_contatado','agendado','enviado','entregue','aberto','clicado','respondeu','falhou','opt_out')),
  erro text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (campanha_id, email)
);

alter table public.campanha_destinatarios add column if not exists nome text;
alter table public.campanha_destinatarios add column if not exists empresa text;
alter table public.campanha_destinatarios add column if not exists cargo text;
alter table public.campanhas add column if not exists objetivo text not null default 'gerar_interesse';

create index if not exists campanhas_org_idx on public.campanhas (organizacao_id, criado_em desc);
create index if not exists campanha_destinatarios_campanha_idx on public.campanha_destinatarios (campanha_id, status);

alter table public.campanhas enable row level security;
alter table public.campanha_destinatarios enable row level security;

drop policy if exists "Membros gerenciam campanhas da organizacao" on public.campanhas;
create policy "Membros gerenciam campanhas da organizacao"
  on public.campanhas for all to authenticated
  using (public._usuario_membro(organizacao_id))
  with check (public._usuario_membro(organizacao_id));

drop policy if exists "Membros gerenciam destinatarios da organizacao" on public.campanha_destinatarios;
create policy "Membros gerenciam destinatarios da organizacao"
  on public.campanha_destinatarios for all to authenticated
  using (public._usuario_membro(organizacao_id))
  with check (public._usuario_membro(organizacao_id));
