
SELECT cron.schedule(
  'popular-radar-proposicoes-3h',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/popular-radar-proposicoes',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
