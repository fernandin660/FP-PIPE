-- ============================================================
-- FP Pipe · Produtos padrão da empresa
-- Cole este script inteiro no SQL Editor do Supabase e clique
-- em RUN. Cria a tabela de produtos da organização e as
-- políticas RLS: leitura para qualquer membro ativo, escrita
-- somente para admin (ou dono solitário — org com 1 membro).
-- ============================================================

-- ============================================================
-- 1. TABELA
-- ============================================================

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 120),
  criado_em timestamptz not null default now(),
  unique (organizacao_id, lower(trim(nome)))
);

create index if not exists idx_produtos_org
  on public.produtos(organizacao_id);

-- ============================================================
-- 2. RLS
-- ============================================================

alter table public.produtos enable row level security;

-- Leitura: qualquer membro ativo da organização
create policy "produtos_leitura_membro" on public.produtos
  for select to authenticated
  using (public._usuario_membro(organizacao_id));

-- Escrita: membro ativo E (admin OU única pessoa na org)
create policy "produtos_escrita_admin" on public.produtos
  for all to authenticated
  using (
    public._usuario_membro(organizacao_id)
    and (
      exists (
        select 1 from public.organizacao_membros m
        where m.organizacao_id = produtos.organizacao_id
          and m.usuario_id = auth.uid()
          and m.papel = 'admin'
          and m.status = 'ativo'
      )
      or (
        select count(*) from public.organizacao_membros m
        where m.organizacao_id = produtos.organizacao_id
          and m.status = 'ativo'
      ) = 1
    )
  )
  with check (
    public._usuario_membro(organizacao_id)
    and (
      exists (
        select 1 from public.organizacao_membros m
        where m.organizacao_id = produtos.organizacao_id
          and m.usuario_id = auth.uid()
          and m.papel = 'admin'
          and m.status = 'ativo'
      )
      or (
        select count(*) from public.organizacao_membros m
        where m.organizacao_id = produtos.organizacao_id
          and m.status = 'ativo'
      ) = 1
    )
  );

-- ============================================================
-- FIM. As rotas /api/produtos usam ctx.orgId + papel do gate
-- para aplicar a mesma regra no servidor (defesa em profundidade).
-- ============================================================