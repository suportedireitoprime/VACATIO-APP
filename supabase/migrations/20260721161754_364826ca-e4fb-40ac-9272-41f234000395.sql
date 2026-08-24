
-- 1) Amplia reminder_dispatch_log
ALTER TABLE public.reminder_dispatch_log
  ADD COLUMN IF NOT EXISTS reminder_type text NOT NULL DEFAULT 'reading',
  ADD COLUMN IF NOT EXISTS retry_attempt int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS article_ref text,
  ADD COLUMN IF NOT EXISTS article_titulo text;

-- livro_id/livro_titulo já são nullable; garantir explicitamente
ALTER TABLE public.reminder_dispatch_log
  ALTER COLUMN livro_id DROP NOT NULL,
  ALTER COLUMN livro_titulo DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reminder_dispatch_log_user_created
  ON public.reminder_dispatch_log (user_id, created_at DESC);

-- 2) Preferências de lembretes por conta
CREATE TABLE IF NOT EXISTS public.user_reminder_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  default_time text NOT NULL DEFAULT '09:00',
  push_enabled boolean NOT NULL DEFAULT true,
  horus_enabled boolean NOT NULL DEFAULT false,
  failure_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_reminder_preferences TO authenticated;
GRANT ALL ON public.user_reminder_preferences TO service_role;

ALTER TABLE public.user_reminder_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own prefs read" ON public.user_reminder_preferences;
CREATE POLICY "own prefs read" ON public.user_reminder_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own prefs write" ON public.user_reminder_preferences;
CREATE POLICY "own prefs write" ON public.user_reminder_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_reminder_prefs_updated
  BEFORE UPDATE ON public.user_reminder_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
