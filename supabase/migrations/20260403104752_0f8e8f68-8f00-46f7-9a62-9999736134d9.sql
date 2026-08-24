
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'enviar-newsletter-diario',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/enviar-newsletter',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
