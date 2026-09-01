-- ============================================================
-- FP Pipe · Deduplicação por organização — índice REGULAR
--
-- SUBSTITUI o índice UNIQUE PARCIAL anterior
-- (idx_companies_org_cnpj_uniq com WHERE organizacao_id IS NOT NULL)
-- por um índice UNIQUE REGULAR em (organizacao_id, cnpj).
--
-- MOTIVO: o cliente Supabase `upsert(..., { onConflict })` gera
-- `ON CONFLICT (colunas)` SEM predicado. Índices PARCIAIS não são
-- inferidos pelo ON CONFLICT (exigem repetir o WHERE), o que faria
-- o insert falhar com "no unique or exclusion constraint matching
-- the ON CONFLICT specification". Um índice REGULAR funciona direto.
--
-- SEGURANÇA (validado antes da criação):
--   • 0 duplicidades intra-organização com CNPJ não nulo
--     (select organizacao_id, cnpj, count(*) from companies
--      where organizacao_id is not null and cnpj is not null
--      group by 1,2 having count(*)>1  →  retorna 0 linhas).
--   • PostgreSQL trata NULLs como DISTINTOS em índice único, logo:
--       - empresas com organizacao_id NULL (89) NÃO conflitam;
--       - empresas com cnpj NULL NÃO conflitam.
--     Nenhuma migração/merge/delete de dados é necessária.
--
-- Este arquivo é para APLICAÇÃO MANUAL. NÃO foi executado automaticamente.
-- ============================================================

drop index if exists idx_companies_org_cnpj_uniq;

create unique index if not exists idx_companies_org_cnpj_uniq
  on public.companies (organizacao_id, cnpj);
