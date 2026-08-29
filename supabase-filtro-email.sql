-- ============================================================
-- FP Pipe · Filtro de e-mail na origem (camada Postgres)
--
-- Garante que NENHUMA escrita — inclusive as diretas do cliente via
-- browser (listas|page.tsx e prospeccao|page.tsx, que contornam as
-- rotas de API) — grave e-mail "sujo" nas tabelas:
--   companies · contatos · emails_cache
--
-- Regras aplicadas em todos os campos de e-mail:
--   * formato básico (`local@domínio.tld`, TLD 2+ letras)
--   * trim/minúsculas/remove pontas `.-_`
--   * extensões de arquivo disfarçadas (.png/.jpg/.webp/.css/.js...)
--   * artefato de scraper (`category_`)
--   * domínios placeholder/descartáveis (example.com, mailinator...)
-- Campos inválidos viram NULL (scalar) ou são removidos (array).
--
-- Rode uma única vez no Supabase > SQL Editor > New query.
-- O gerador dinâmico (`do $$`) só toca colunas `%email%` que existirem,
-- então não quebra se alguma instância não tiver colunas mais novas.
-- ============================================================

-- ---- validador de valor único ----
create or replace function public._fp_email_valido(valor text) returns text
language plpgsql stable
as $$
declare
  limpo text;
  dominio text;
begin
  if valor is null then return null; end if;
  limpo := lower(btrim(valor));
  if limpo = '' then return null; end if;
  limpo := regexp_replace(limpo, '^[._\-]+|[._\-]+$', '', 'g');
  if limpo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[a-z]{2,}$' then return null; end if;
  if limpo ~ '\.(png|jpe?g|gif|webp|svg|css|js|pdf|ico)$' then return null; end if;
  if strpos(limpo, 'category_') > 0 then return null; end if;
  dominio := split_part(limpo, '@', 2);
  if dominio = any (array[
    'example.com','example.org','example.net','example.co','domain.com','yourdomain',
    'yourdomain.com','email.com','akademeia','sentry.io','wixpress.com','parastorage.com',
    'cloudflare','godaddy.com','squarespace.com','shopify.com',
    'mailinator.com','mailinator.net','yopmail.com','yopmail.fr','10minutemail.com',
    'guerrillamail.com','guerrillamail.biz','tempmail.com','temp-mail.org','throwawaymail.com',
    'trashmail.com','sharklasers.com','spam4.me','mytemp.email','getnada.com','inboxbear.com',
    'dispostable.com','maildrop.cc','mailnesia.com','mailcatch.com','1secmail.com',
    'luxusmail.org','spambox.us','burnermail.io','tmpmail.org','fakemail.net','maildump.com'
  ]) then return null; end if;
  if dominio like '%.example.com' or dominio like '%.example.org' or dominio like '%.example.net'
     or dominio like '%.mailinator.com' or dominio like '%.yopmail.com' or dominio like '%.10minutemail.com'
     or dominio like '%.guerrillamail.com' or dominio like '%.tempmail.com' or dominio like '%.throwawaymail.com'
     or dominio like '%.trashmail.com' or dominio like '%.sharklasers.com' or dominio like '%.getnada.com'
     or dominio like '%.temp-mail.org'
  then return null; end if;
  return limpo;
end $$;

-- ---- validador de array (emails, emails_extra) ----
create or replace function public._fp_filtra_emails_array(vals text[]) returns text[]
language plpgsql stable
as $$
declare
  saida text[] := '{}';
  v text;
  limpo text;
begin
  if vals is null then return null; end if;
  foreach v in array vals loop
    limpo := public._fp_email_valido(v);
    if limpo is not null and not (limpo = any(saida)) then
      saida := array_append(saida, limpo);
    end if;
  end loop;
  return saida;
end $$;

-- ---- gerador dinâmico: trigger por tabela, só nas colunas que existem ----
do $$
declare
  tabela text;
  r record;
  scalars text := '';
  arrays text := '';
  nome_funcao text;
begin
  foreach tabela in array array['companies','contatos','emails_cache'] loop
    scalars := '';
    arrays := '';
    for r in
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = tabela
        and column_name like '%email%'
        and data_type in ('text','character varying')
    loop
      scalars := scalars || format('NEW.%I := public._fp_email_valido(NEW.%I::text); ', r.column_name, r.column_name);
    end loop;
    for r in
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = tabela
        and column_name like '%email%'
        and data_type = 'ARRAY'
    loop
      arrays := arrays || format('NEW.%I := public._fp_filtra_emails_array(NEW.%I); ', r.column_name, r.column_name);
    end loop;

    if scalars <> '' or arrays <> '' then
      nome_funcao := format('public._fp_trigger_%s', tabela);
      execute format(
        'create or replace function %I() returns trigger language plpgsql as $fn$ begin %s %s return NEW; end $fn$',
        nome_funcao, scalars, arrays
      );
      execute format('drop trigger if exists fp_filtro_email on public.%I', tabela);
      execute format(
        'create trigger fp_filtro_email before insert or update on public.%I for each row execute function %I()',
        tabela, nome_funcao
      );
    end if;
  end loop;
end $$;
