-- Migração: expandir cache de enriquecimento (commit bf870d0)
-- Rodar no Supabase SQL Editor (o usuário confirmou que rodará os SQLs pendentes)

ALTER TABLE enriquecimento_cache
  ADD COLUMN IF NOT EXISTS cargo TEXT,
  ADD COLUMN IF NOT EXISTS dados_cadastrais JSONB,
  ADD COLUMN IF NOT EXISTS emails JSONB,
  ADD COLUMN IF NOT EXISTS fontes JSONB;