-- Cron job: Headlines de PLs a cada hora (minuto 30)
SELECT cron.schedule(
  'popular-pl-headlines-1h',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/popular-radar-proposicoes',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{"only_headlines": true}'::jsonb
  ) as request_id;
  $$
);

-- Cron job: Explicações CF88 diariamente às 3h
SELECT cron.schedule(
  'popular-explicacoes-cf88',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/popular-explicacoes',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{"tabela":"CF88_CONSTITUICAO_FEDERAL","limit":10}'::jsonb
  ) as request_id;
  $$
);

-- Cron job: Explicações CP/CC/CPC diariamente às 4h
SELECT cron.schedule(
  'popular-explicacoes-codigos',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/popular-explicacoes',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{"tabela":"CP_CODIGO_PENAL","limit":10}'::jsonb
  ) as request_id;
  $$
);

-- Cron job: Explicações CLT/CDC/CTN diariamente às 5h
SELECT cron.schedule(
  'popular-explicacoes-trabalho',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url:='https://akaeinqkhdwzopfsckgg.supabase.co/functions/v1/popular-explicacoes',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrYWVpbnFraGR3em9wZnNja2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkwNDAsImV4cCI6MjA4OTkwNTA0MH0.hsArqG_p5u9P4QjJNfXTdpBVcdImEVmkl24EaT9jJ_w"}'::jsonb,
    body:='{"tabela":"CLT_CONSOLIDACAO_LEIS_TRABALHO","limit":10}'::jsonb
  ) as request_id;
  $$
);