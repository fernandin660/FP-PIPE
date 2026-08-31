-- ============================================================
-- FP Pipe · CRM — Fase 3 (campos comerciais do pipeline)
--
-- Rode este script inteiro no Supabase > SQL Editor > New query.
-- Idempotente: pode rodar mais de uma vez sem efeitos colaterais.
--
-- Adiciona campos comerciais ao lead do pipeline para alimentar o
-- Painel de Métricas e os relatórios:
--   • valor_oportunidade numeric  — valor da oportunidade em R$
--   • produto text                — produto/serviço que está sendo vendido
-- ============================================================

alter table public.lead_pipeline
  add column if not exists valor_oportunidade numeric;

alter table public.lead_pipeline
  add column if not exists produto text;

-- Ajuda nas consultas do painel (somando valor por estágio/produto).
create index if not exists idx_lead_pipeline_valor
  on public.lead_pipeline (organizacao_id, stage_id, valor_oportunidade);
