-- Migração definitiva para agendamento dos crons do Radar de Leis / Resenha Diária
-- Apontando corretamente para o projeto ativo: tlpxubeagmxapkysgobk

-- 1) Remove todos os cron jobs antigos/obsoletos de resenha e radar
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT jobid, jobname FROM cron.job
    WHERE jobname ILIKE '%scrape-resenha%'
       OR jobname ILIKE '%resenha%'
       OR jobname ILIKE '%radar-leis%'
       OR jobname ILIKE '%popular-texto-resenha%'
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

-- 2) Agenda os horários de raspagem diária: 7h, 11h e 21h (Horário de Brasília, UTC-3)
-- UTC: 10h, 14h, e 0h
SELECT cron.schedule(
  'radar-leis-scrape-7h',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo'
    ),
    body:=jsonb_build_object('origem','cron','notify',true),
    timeout_milliseconds:=120000
  );
  $$
);

SELECT cron.schedule(
  'radar-leis-scrape-11h',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url:='https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo'
    ),
    body:=jsonb_build_object('origem','cron','notify',true),
    timeout_milliseconds:=120000
  );
  $$
);

SELECT cron.schedule(
  'radar-leis-scrape-21h',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo'
    ),
    body:=jsonb_build_object('origem','cron','notify',true),
    timeout_milliseconds:=120000
  );
  $$
);

-- 3) Agenda a busca do texto integral e explicação IA a cada 3 horas
SELECT cron.schedule(
  'popular-texto-resenha-3h',
  '30 7,10,13,16,19,22 * * *',
  $$
  SELECT net.http_post(
    url:='https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/popular-texto-resenha',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo'
    ),
    body:=jsonb_build_object('limit', 20),
    timeout_milliseconds:=120000
  );
  $$
);
