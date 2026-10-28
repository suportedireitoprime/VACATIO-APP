-- ==============================================================================
-- Migração: Remover cron job e tabelas de Notícias Oficiais (STF, Câmara, Senado)
-- Mantendo exclusivamente as notícias jurídicas via Migalhas (public.noticias_juridicas)
-- ==============================================================================

DO $$
DECLARE r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR r IN
      SELECT jobid, jobname FROM cron.job
      WHERE jobname ILIKE '%sync-noticias-oficiais%'
         OR jobname ILIKE '%noticias-oficiais%'
    LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;
  END IF;
END $$;

DROP TABLE IF EXISTS public.noticias_stf CASCADE;
DROP TABLE IF EXISTS public.noticias_camara CASCADE;
DROP TABLE IF EXISTS public.noticias_senado CASCADE;
