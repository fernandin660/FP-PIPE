-- FP Pipe - controle de alertas/já-enviados para créditos baixos e upsell.
-- Tabela usada apenas pelo backend (admin client). Guarda uma linha por
-- "chave da alerta + mes" para garantir que cada aviso dispare só 1x/mês.

create table if not exists public.alertas_creditos (
  id bigint generated always as identity primary key,
  chave text not null,
  mes text not null,
  criado_em timestamptz not null default now(),
  unique (chave, mes)
);

-- Acesso apenas via service role (backend). Sem policies de leitura por
-- usuário: nenhum cliente autenticado deve consultar esta tabela.
alter table public.alertas_creditos enable row level security;

create index if not exists alertas_creditos_chave_mes_idx
  on public.alertas_creditos (chave, mes);
