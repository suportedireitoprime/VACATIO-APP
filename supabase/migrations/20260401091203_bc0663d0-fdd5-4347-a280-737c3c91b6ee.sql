
SELECT cron.unschedule(2);

SELECT cron.schedule(
  'resenha-13h',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{"time":"13h"}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'resenha-18h',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/scrape-resenha-diaria',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{"time":"18h"}'::jsonb
  ) as request_id;
  $$
);
