-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove old job if exists
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'scrape-resenha-diaria-3h';

-- Create new cron job: every 3 hours starting 7 UTC (4h Brasília)
SELECT cron.schedule(
  'scrape-resenha-diaria-3h',
  '0 7,10,13,16,19,22 * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);