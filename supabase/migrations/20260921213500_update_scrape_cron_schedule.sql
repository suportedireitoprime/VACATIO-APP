-- Remove todos os cron jobs antigos do radar
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT jobid, jobname FROM cron.job
    WHERE jobname ILIKE '%scrape-resenha%'
       OR jobname ILIKE '%resenha-diaria%'
       OR jobname ILIKE '%radar-leis%'
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

-- Agenda os novos horários: 7h, 11h e 21h (horário de Brasília - UTC-3)
-- Correspondente em UTC: 10h, 14h, e 0h
SELECT cron.schedule(
  'radar-leis-scrape-7h',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://iftdrbxvekrhzstayjwp.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
    ),
    body:=jsonb_build_object('origem','cron','notify',true)
  );
  $$
);

SELECT cron.schedule(
  'radar-leis-scrape-11h',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url:='https://iftdrbxvekrhzstayjwp.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
    ),
    body:=jsonb_build_object('origem','cron','notify',true)
  );
  $$
);

SELECT cron.schedule(
  'radar-leis-scrape-21h',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://iftdrbxvekrhzstayjwp.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
    ),
    body:=jsonb_build_object('origem','cron','notify',true)
  );
  $$
);
