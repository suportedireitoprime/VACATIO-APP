-- ==============================================================================
-- Cron Job: Sincronização periódica das Notícias Oficiais (STF, Câmara, Senado)
-- Executa a cada 15 minutos via pg_cron + pg_net chamando sync-noticias-oficiais
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove job anterior se já existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-noticias-oficiais-15m') THEN
    PERFORM cron.unschedule('sync-noticias-oficiais-15m');
  END IF;
END $$;

-- Cria cron job a cada 15 minutos
SELECT cron.schedule(
  'sync-noticias-oficiais-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/sync-noticias-oficiais',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo'
    ),
    body:=jsonb_build_object('fonte','todas','origem','cron')
  );
  $$
);
