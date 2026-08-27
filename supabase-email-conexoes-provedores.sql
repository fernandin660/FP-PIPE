-- Habilita Zoho e guarda o accountId necessário pela API do Zoho Mail.
alter table public.email_conexoes add column if not exists account_id text;
alter table public.email_conexoes drop constraint if exists email_conexoes_provedor_check;
alter table public.email_conexoes add constraint email_conexoes_provedor_check
  check (provedor in ('google', 'microsoft', 'zoho'));
