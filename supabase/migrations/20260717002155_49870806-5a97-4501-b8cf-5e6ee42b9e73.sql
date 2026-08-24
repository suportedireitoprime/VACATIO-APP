
-- 1) Coluna tipo em push_campaigns
ALTER TABLE public.push_campaigns
  ADD COLUMN IF NOT EXISTS tipo text;
CREATE INDEX IF NOT EXISTS push_campaigns_tipo_idx ON public.push_campaigns (tipo);

-- 2) Tabela de histórico de execuções do Radar de Leis
CREATE TABLE IF NOT EXISTS public.radar_leis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  origem text NOT NULL DEFAULT 'cron',       -- 'cron' | 'manual'
  status text NOT NULL DEFAULT 'ok',         -- 'ok' | 'sem_novidades' | 'erro'
  novos_count int NOT NULL DEFAULT 0,
  atos_ids text[] NOT NULL DEFAULT '{}'::text[],
  push_campaign_id uuid REFERENCES public.push_campaigns(id) ON DELETE SET NULL,
  push_titulo text,
  push_subtitulo text,
  erro text
);
CREATE INDEX IF NOT EXISTS radar_leis_runs_iniciado_idx ON public.radar_leis_runs (iniciado_em DESC);

GRANT SELECT ON public.radar_leis_runs TO authenticated;
GRANT ALL ON public.radar_leis_runs TO service_role;

ALTER TABLE public.radar_leis_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin le radar_leis_runs" ON public.radar_leis_runs;
CREATE POLICY "admin le radar_leis_runs" ON public.radar_leis_runs
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 3) Reagenda cron do Radar de Leis (10h e 20h America/Sao_Paulo -> 13/23 UTC)
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

SELECT cron.schedule(
  'radar-leis-scrape-10h',
  '0 13 * * *',
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
  'radar-leis-scrape-20h',
  '0 23 * * *',
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
