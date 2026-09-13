-- Migrar uso_mensal de usuario_id para organizacao_id (multi-empresa)
-- Executar no Supabase SQL Editor.
--
-- VERSÃO CONSOLIDADA com dedup: no período em que o registro rodava pela PK
-- legada (usuario_id, mes), cada usuário da mesma org gravava a própria
-- linha, gerando duplicatas de (organizacao_id, mes). Antes de criar a
-- constraint única, mantemos uma linha por org+mês com a SOMA das contagens.

-- 0. Diagnóstico opcional
SELECT organizacao_id, mes, count(*) AS linhas
FROM uso_mensal
WHERE organizacao_id IS NOT NULL
GROUP BY organizacao_id, mes
HAVING count(*) > 1
ORDER BY linhas DESC;

-- 1. Adiciona coluna organizacao_id (nullable primeiro)
ALTER TABLE uso_mensal ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);

-- 2. Backfill: copia organizacao_id da membership de cada usuario
UPDATE uso_mensal u
SET organizacao_id = m.organizacao_id
FROM organizacao_membros m
WHERE u.usuario_id = m.usuario_id
  AND m.status = 'ativo'
  AND u.organizacao_id IS NULL;

-- 3. Torna NOT NULL (se ainda houver NULLs, corrigir a membership antes)
ALTER TABLE uso_mensal ALTER COLUMN organizacao_id SET NOT NULL;

-- 4. Apaga duplicados: mantém a linha mais recente de cada (org, mês)
DELETE FROM uso_mensal u
USING (
  SELECT id, row_number() OVER (
    PARTITION BY organizacao_id, mes
    ORDER BY atualizado_em DESC, empresas_geradas DESC
  ) AS rn
  FROM uso_mensal
  WHERE organizacao_id IS NOT NULL
) d
WHERE u.id = d.id AND d.rn > 1;

-- 5. A linha sobrevivente de cada (org, mês) recebe a SOMA das contagens
--    (o contador antigo era por usuário; o da org é a soma da equipe)
UPDATE uso_mensal u
SET empresas_geradas = g.total,
    atualizado_em = g.ultimo
FROM (
  SELECT organizacao_id, mes,
         sum(empresas_geradas) AS total,
         max(atualizado_em) AS ultimo
  FROM uso_mensal
  GROUP BY organizacao_id, mes
) g
WHERE u.organizacao_id = g.organizacao_id AND u.mes = g.mes;

-- 6. Varre índices/constraints parciais de tentativas anteriores
DROP INDEX IF EXISTS idx_uso_mensal_org_mes;
DROP INDEX IF EXISTS idx_uso_mensal_org_mes_uniq;
ALTER TABLE uso_mensal DROP CONSTRAINT IF EXISTS uso_mensal_org_mes_key;
ALTER TABLE uso_mensal DROP CONSTRAINT IF EXISTS uso_mensal_usuario_id_mes_key;

-- 7. Constraint única canônica: uma linha por organização por mês
ALTER TABLE uso_mensal ADD CONSTRAINT uso_mensal_org_mes_key UNIQUE (organizacao_id, mes);

-- 8. Índice para queries por org+mes
CREATE INDEX IF NOT EXISTS idx_uso_mensal_org_mes ON uso_mensal(organizacao_id, mes);