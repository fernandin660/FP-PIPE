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

-- 0. Varre índices/constraints parciais de tentativas anteriores. PRECISA
--    vir ANTES do backfill: se um índice unique (org, mes) já existir, o
--    UPDATE de backfill viola 23505 ao encostar no mesmo par.
DROP INDEX IF EXISTS idx_uso_mensal_org_mes;
DROP INDEX IF EXISTS idx_uso_mensal_org_mes_uniq;
ALTER TABLE uso_mensal DROP CONSTRAINT IF EXISTS uso_mensal_org_mes_key;
ALTER TABLE uso_mensal DROP CONSTRAINT IF EXISTS uso_mensal_usuario_id_mes_key;

-- 1. Adiciona coluna organizacao_id (nullable primeiro)
ALTER TABLE uso_mensal ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);

-- 2. Backfill: copia organizacao_id da membership de cada usuario.
--    Correlated subquery com LIMIT 1 para usuários com mais de uma org ativa.
UPDATE uso_mensal u
SET organizacao_id = (
  SELECT m.organizacao_id
  FROM organizacao_membros m
  WHERE m.usuario_id = u.usuario_id
    AND m.status = 'ativo'
  ORDER BY m.criado_em
  LIMIT 1
)
WHERE u.organizacao_id IS NULL;

-- 2b. Pré-checagem: precisa retornar 0 antes de criar NOT NULL.
--     Se retornar > 0, há usuário sem membership ativa (preencher manualmente).
SELECT count(*) AS ainda_sem_org
FROM uso_mensal
WHERE organizacao_id IS NULL;

-- 3. Torna NOT NULL (se ainda houver NULLs, corrigir a membership antes)
ALTER TABLE uso_mensal ALTER COLUMN organizacao_id SET NOT NULL;

-- 4. Colapsa duplicatas de (org, mes) NUMA ÚNICA declaração: calcula a SOMA
--    sobre TODAS as linhas do grupo ANTES, mantém a mais recente e a ajusta
--    para o total (evita o bug "soma após apagar"). PK é (usuario_id, mes).
WITH pacto AS (
  SELECT u.usuario_id, u.mes, u.organizacao_id,
         sum(u.empresas_geradas) OVER (PARTITION BY u.organizacao_id, u.mes) AS total,
         row_number() OVER (
           PARTITION BY u.organizacao_id, u.mes
           ORDER BY u.atualizado_em DESC, u.empresas_geradas DESC
         ) AS rn
  FROM uso_mensal u
  WHERE u.organizacao_id IS NOT NULL
),
para_apagar AS (
  SELECT usuario_id, mes FROM pacto WHERE rn > 1
),
para_atualizar AS (
  SELECT usuario_id, mes, total FROM pacto WHERE rn = 1
),
apagados AS (
  DELETE FROM uso_mensal u USING para_apagar p
  WHERE u.usuario_id = p.usuario_id AND u.mes = p.mes
  RETURNING u.usuario_id
)
UPDATE uso_mensal u
SET empresas_geradas = p.total
FROM para_atualizar p
WHERE u.usuario_id = p.usuario_id AND u.mes = p.mes;

-- 5. Diagnóstico final: espera-se 1 linha por (org, mes)
SELECT organizacao_id, mes, count(*) AS linhas
FROM uso_mensal
WHERE organizacao_id IS NOT NULL
GROUP BY organizacao_id, mes
HAVING count(*) > 1;

-- 6. Constraint única canônica: uma linha por organização por mês.
--    Bloco idempotente: não falha se já existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uso_mensal_org_mes_key'
  ) THEN
    ALTER TABLE uso_mensal ADD CONSTRAINT uso_mensal_org_mes_key UNIQUE (organizacao_id, mes);
  END IF;
END
$$;

-- 7. Índice para queries por org+mes
CREATE INDEX IF NOT EXISTS idx_uso_mensal_org_mes ON uso_mensal(organizacao_id, mes);