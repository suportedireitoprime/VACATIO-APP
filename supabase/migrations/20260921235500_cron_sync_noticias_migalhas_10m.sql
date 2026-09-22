-- Agenda cron job para raspagem e sincronização de notícias jurídicas (Migalhas) a cada 10 minutos
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT jobid, jobname FROM cron.job
    WHERE jobname ILIKE '%sync-noticias%'
       OR jobname ILIKE '%noticias-migalhas%'
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'sync-noticias-migalhas',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://iftdrbxvekrhzstayjwp.supabase.co/functions/v1/sync-noticias-migalhas',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
    ),
    body:=jsonb_build_object('origem','cron')
  );
  $$
);
