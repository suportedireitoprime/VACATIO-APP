CREATE TABLE public.article_time_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artigo_ref text NOT NULL,
  artigo_titulo text NOT NULL,
  label text NOT NULL,
  message text NOT NULL DEFAULT '',
  time_of_day text NOT NULL, -- 'HH:MM' local (timezone)
  days_of_week int[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Dom..6=Sáb
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  channel text NOT NULL DEFAULT 'push' CHECK (channel IN ('push','horus','both')),
  active boolean NOT NULL DEFAULT true,
  last_fired_at timestamptz,
  next_fire_at timestamptz,
  triggered_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_time_reminders TO authenticated;
GRANT ALL ON public.article_time_reminders TO service_role;

ALTER TABLE public.article_time_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own reminders read" ON public.article_time_reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reminders insert" ON public.article_time_reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reminders update" ON public.article_time_reminders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reminders delete" ON public.article_time_reminders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX article_time_reminders_user_artigo_idx
  ON public.article_time_reminders (user_id, artigo_ref);
CREATE INDEX article_time_reminders_next_fire_idx
  ON public.article_time_reminders (next_fire_at) WHERE active = true;

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_article_time_reminders_updated
  BEFORE UPDATE ON public.article_time_reminders
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

SELECT cron.schedule(
  'article-reminders-tick-1min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://iftdrbxvekrhzstayjwp.supabase.co/functions/v1/article-reminders-tick',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);