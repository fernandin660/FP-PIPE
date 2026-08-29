-- ============================================================
-- Tabela de créditos de telefone (moeda separada)
-- Cada telefone verificado custa 1 crédito
-- Gold: 50 créditos = 50 telefones
-- Platinum: 100 créditos = 100 telefones
-- ============================================================

create table if not exists public.creditos_telefone (
  id           uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  saldo        integer not null default 0,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (organizacao_id)
);

alter table public.creditos_telefone enable row level security;

-- Usuários autenticados podem ler o saldo da própria org
create policy "Usuarios veem saldo telefone da propria org"
  on public.creditos_telefone for select
  using (
    exists (
      select 1 from public.organizacao_membros
      where organizacao_membros.organizacao_id = creditos_telefone.organizacao_id
        and organizacao_membros.usuario_id = auth.uid()
    )
  );

-- Service role pode fazer tudo (para API routes com admin client)
create policy "Service role gerencia creditos_telefone"
  on public.creditos_telefone for all
  using (true)
  with check (true);

-- Conceder saldo inicial de telefone para assinaturas existentes
-- Gold: 50, Platinum: 100, Gold INTL: 50, Platinum INTL: 100
do $$
declare
  r record;
begin
  for r in
    select a.usuario_id, a.plano, o.id as org_id
    from public.assinaturas a
    join public.organizacao_membros om on om.usuario_id = a.usuario_id and om.papel = 'admin'
    join public.organizacoes o on o.id = om.organizacao_id
    where a.status = 'ativa'
      and a.plano in ('gold', 'platinum', 'gold_intl', 'platinum_intl')
  loop
    insert into public.creditos_telefone (organizacao_id, saldo)
     values (r.org_id, case when r.plano like 'platinum%' then 100 else 50 end)
    on conflict (organizacao_id) do nothing;
  end loop;
end $$;
