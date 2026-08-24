
-- 1. RPC contar_cache_por_lei: batch check which articles have AI cache
CREATE OR REPLACE FUNCTION public.contar_cache_por_lei(p_tabela text)
RETURNS TABLE(artigo_numero text, modos_cached text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT ac.artigo_numero, array_agg(DISTINCT ac.modo)::text[]
    FROM artigo_ai_cache ac
    WHERE ac.tabela_nome = p_tabela
    GROUP BY ac.artigo_numero;
END;
$$;

-- 2. RPC artigos_relacionados: find articles in the same titulo/capitulo
CREATE OR REPLACE FUNCTION public.artigos_relacionados(p_tabela text, p_numero text, p_limit integer DEFAULT 10)
RETURNS TABLE(numero text, caput text, titulo text, capitulo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_titulo text;
  v_capitulo text;
BEGIN
  EXECUTE format('SELECT titulo, capitulo FROM %I WHERE numero = $1 LIMIT 1', p_tabela)
    INTO v_titulo, v_capitulo USING p_numero;

  IF v_capitulo IS NOT NULL THEN
    RETURN QUERY EXECUTE format(
      'SELECT numero, caput, titulo, capitulo FROM %I WHERE capitulo = $1 AND numero != $2 ORDER BY ordem_numero LIMIT $3',
      p_tabela
    ) USING v_capitulo, p_numero, p_limit;
  ELSIF v_titulo IS NOT NULL THEN
    RETURN QUERY EXECUTE format(
      'SELECT numero, caput, titulo, capitulo FROM %I WHERE titulo = $1 AND numero != $2 ORDER BY ordem_numero LIMIT $3',
      p_tabela
    ) USING v_titulo, p_numero, p_limit;
  END IF;
END;
$$;

-- 3. Materialized view for weekly ranking
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ranking_semanal AS
SELECT
  user_id,
  SUM(total)::bigint AS questoes,
  SUM(correct)::bigint AS corretas,
  CASE WHEN SUM(total) > 0
    THEN ROUND((SUM(correct)::numeric / SUM(total)::numeric) * 100)::integer
    ELSE 0
  END AS pct,
  COUNT(*)::bigint AS sessoes
FROM study_sessions
WHERE created_at > now() - interval '7 days'
GROUP BY user_id
ORDER BY questoes DESC;

-- Index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ranking_user ON mv_ranking_semanal(user_id);

-- 4. Cron job: refresh ranking daily at 3am UTC
SELECT cron.schedule(
  'refresh-ranking-semanal',
  '0 3 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ranking_semanal'
);

-- 5. Cron job: clean old AI cache (>90 days)
SELECT cron.schedule(
  'limpar-cache-ai-antigo',
  '0 4 * * 0',
  $$DELETE FROM artigo_ai_cache WHERE created_at < now() - interval '90 days'$$
);
