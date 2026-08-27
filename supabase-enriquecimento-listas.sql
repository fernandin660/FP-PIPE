-- FP Pipe - campos para enriquecer empresas durante a geração de listas.

alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists emails_extra text[] not null default '{}';
alter table public.companies add column if not exists telefones_extra text[] not null default '{}';
alter table public.companies add column if not exists linkedin text;

create index if not exists companies_website_idx on public.companies (website);
