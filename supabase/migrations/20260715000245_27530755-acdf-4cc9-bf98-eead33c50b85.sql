-- Remove qualquer job do pg_cron ligado às funções da Câmara
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobname FROM cron.job WHERE jobname ILIKE '%camara%' OR command ILIKE '%sync-noticias-camara%' OR command ILIKE '%scrape-noticias%' LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Remove a tabela de notícias da Câmara (fonte descontinuada — só Migalhas agora)
DROP TABLE IF EXISTS public.noticias_camara CASCADE;