-- ============================================================
-- FP Pipe — Créditos atômico via RPC (segurança business logic)
--
-- Corrige o TOCTOU/race do padrão "ler saldo -> saldo - N -> update".
-- Dois requests concorrentes podiam ler o mesmo saldo e gravar o
-- mesmo valor obsoleto, debitando menos do que o consumo real.
--
-- Estas funções fazem o decremento de forma ATÔMICA dentro de um
-- único UPDATE a nível de banco (saldo = saldo - N ... where saldo >= N),
-- eliminando a corrida.
--
-- IMPORTANTE: rodar este script no SQL Editor do Supabase (PRODUÇÃO).
-- O padrão de segurança: a tabela é validada por whitelist (sem dinâmica
-- arbitrária) e as funções são SECURITY DEFINER com search_path public.
-- ============================================================

-- Decrementa créditos por organização (atomicidade garantida pelo banco)
create or replace function public.debitar_saldo_org(
  p_tabela text,
  p_org uuid,
  p_qtd integer default 1
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tabela_ok text := case p_tabela
    when 'creditos' then 'creditos'
    when 'creditos_contatos' then 'creditos_contatos'
    when 'creditos_ia' then 'creditos_ia'
    when 'creditos_telefone' then 'creditos_telefone'
    else null end;
  novo integer;
begin
  if tabela_ok is null then
    raise exception 'tabela invalida';
  end if;
  if p_org is null or p_qtd is null or p_qtd <= 0 then
    return null;
  end if;

  execute format(
    'update public.%I ' ||
    'set saldo = saldo - $1, atualizado_em = now() ' ||
    'where organizacao_id = $2 and saldo >= $1 returning saldo',
    tabela_ok
  )
  into novo
  using p_qtd, p_org;

  return novo;
end $$;

-- Decrementa créditos por usuário (legado, tabelas com usuario_id)
create or replace function public.debitar_saldo_usuario(
  p_tabela text,
  p_usuario uuid,
  p_qtd integer default 1
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tabela_ok text := case p_tabela
    when 'creditos' then 'creditos'
    when 'creditos_contatos' then 'creditos_contatos'
    when 'creditos_ia' then 'creditos_ia'
    when 'creditos_telefone' then 'creditos_telefone'
    else null end;
  novo integer;
begin
  if tabela_ok is null then
    raise exception 'tabela invalida';
  end if;
  if p_usuario is null or p_qtd is null or p_qtd <= 0 then
    return null;
  end if;

  execute format(
    'update public.%I ' ||
    'set saldo = saldo - $1, atualizado_em = now() ' ||
    'where usuario_id = $2 and saldo >= $1 returning saldo',
    tabela_ok
  )
  into novo
  using p_qtd, p_usuario;

  return novo;
end $$;

-- Credita (estorno) por organização
create or replace function public.creditar_saldo_org(
  p_tabela text,
  p_org uuid,
  p_qtd integer default 1
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tabela_ok text := case p_tabela
    when 'creditos' then 'creditos'
    when 'creditos_contatos' then 'creditos_contatos'
    when 'creditos_ia' then 'creditos_ia'
    when 'creditos_telefone' then 'creditos_telefone'
    else null end;
  novo integer;
begin
  if tabela_ok is null then
    raise exception 'tabela invalida';
  end if;
  if p_org is null or p_qtd is null or p_qtd <= 0 then
    return null;
  end if;

  execute format(
    'update public.%I ' ||
    'set saldo = saldo + $1, atualizado_em = now() ' ||
    'where organizacao_id = $2 returning saldo',
    tabela_ok
  )
  into novo
  using p_qtd, p_org;

  return novo;
end $$;

-- Credita (estorno) por usuário (legado)
create or replace function public.creditar_saldo_usuario(
  p_tabela text,
  p_usuario uuid,
  p_qtd integer default 1
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tabela_ok text := case p_tabela
    when 'creditos' then 'creditos'
    when 'creditos_contatos' then 'creditos_contatos'
    when 'creditos_ia' then 'creditos_ia'
    when 'creditos_telefone' then 'creditos_telefone'
    else null end;
  novo integer;
begin
  if tabela_ok is null then
    raise exception 'tabela invalida';
  end if;
  if p_usuario is null or p_qtd is null or p_qtd <= 0 then
    return null;
  end if;

  execute format(
    'update public.%I ' ||
    'set saldo = saldo + $1, atualizado_em = now() ' ||
    'where usuario_id = $2 returning saldo',
    tabela_ok
  )
  into novo
  using p_qtd, p_usuario;

  return novo;
end $$;
