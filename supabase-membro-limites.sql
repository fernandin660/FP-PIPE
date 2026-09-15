-- Adiciona colunas de limites individuais de créditos por membro na tabela organizacao_membros
-- Para planos Gold e Platinum onde o admin distribui o pool compartilhado.

alter table public.organizacao_membros
  add column if not exists limite_listas integer default null,
  add column if not exists limite_buscador integer default null,
  add column if not exists limite_telefone integer default null,
  add column if not exists limite_ia integer default null;

comment on column public.organizacao_membros.limite_listas is 'Limite individual de créditos de listas (null = sem teto individual)';
comment on column public.organizacao_membros.limite_buscador is 'Limite individual de buscas/e-mails (null = sem teto individual)';
comment on column public.organizacao_membros.limite_telefone is 'Limite individual de telefones (null = sem teto individual)';
comment on column public.organizacao_membros.limite_ia is 'Limite individual de abordagens de IA (null = sem teto individual)';
