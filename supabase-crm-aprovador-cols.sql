-- ============================================================
-- FP Pipe · Colunas faltantes em companies (aprovador_nome/cargo)
--
-- O CRM (/api/crm) e a Company Intelligence (/api/crm/intelligence)
-- referenciam companies.aprovador_nome e companies.aprovador_cargo.
-- A migration anterior só criou aprovador_email/telefone/linkedin;
-- sem nome/cargo, o SELECT do CRM falha e todas as empresas são
-- retornadas como null ("Dados da empresa indisponíveis").
--
-- Aditivo e idempotente. NÃO remove/renomeia nenhuma coluna.
-- ============================================================

alter table public.companies
  add column if not exists aprovador_nome text;

alter table public.companies
  add column if not exists aprovador_cargo text;
