-- Migrar uso_mensal de usuario_id para organizacao_id (multi-empresa)
-- Executar no Supabase SQL Editor

-- 1. Adiciona coluna organizacao_id (nullable primeiro)
ALTER TABLE uso_mensal ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);

-- 2. Backfill: copia organizacao_id da membership de cada usuario
UPDATE uso_mensal u
SET organizacao_id = m.organizacao_id
FROM organizacao_membros m
WHERE u.usuario_id = m.usuario_id
  AND m.status = 'ativo'
  AND u.organizacao_id IS NULL;

-- 3. Agora torna NOT NULL (todos os registros devem ter org)
ALTER TABLE uso_mensal ALTER COLUMN organizacao_id SET NOT NULL;

-- 4. Unique constraint: uma linha por organização por mês
ALTER TABLE uso_mensal DROP CONSTRAINT IF EXISTS uso_mensal_usuario_id_mes_key;
ALTER TABLE uso_mensal ADD CONSTRAINT uso_mensal_org_mes_key UNIQUE (organizacao_id, mes);

-- 5. Índice para queries por org+mes
CREATE INDEX IF NOT EXISTS idx_uso_mensal_org_mes ON uso_mensal(organizacao_id, mes);
