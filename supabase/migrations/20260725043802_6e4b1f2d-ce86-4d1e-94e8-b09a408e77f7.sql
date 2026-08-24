
-- 1) Fix missing GRANTs on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigos_grifos    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigos_anotacoes TO authenticated;
GRANT ALL ON public.artigos_grifos    TO service_role;
GRANT ALL ON public.artigos_anotacoes TO service_role;

-- 2) artigo_ai_cache (shared cache per article+type)
CREATE TABLE public.artigo_ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_codigo text NOT NULL,
  numero_artigo text NOT NULL,
  tipo text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tabela_codigo, numero_artigo, tipo)
);
GRANT SELECT, INSERT, UPDATE ON public.artigo_ai_cache TO authenticated;
GRANT ALL ON public.artigo_ai_cache TO service_role;
ALTER TABLE public.artigo_ai_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI cache readable by authenticated" ON public.artigo_ai_cache
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "AI cache insert by authenticated" ON public.artigo_ai_cache
  FOR INSERT TO authenticated WITH CHECK (created_by IS NULL OR created_by = auth.uid());
CREATE POLICY "AI cache update by authenticated" ON public.artigo_ai_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_artigo_ai_cache_updated_at
  BEFORE UPDATE ON public.artigo_ai_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) location_reminders
CREATE TABLE public.location_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artigo_ref text NOT NULL,
  label text,
  address text,
  lat double precision,
  lng double precision,
  radius_m integer NOT NULL DEFAULT 150,
  message text,
  active boolean NOT NULL DEFAULT true,
  triggered_count integer NOT NULL DEFAULT 0,
  channel text NOT NULL DEFAULT 'push',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_reminders TO authenticated;
GRANT ALL ON public.location_reminders TO service_role;
ALTER TABLE public.location_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc reminders select own" ON public.location_reminders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "loc reminders insert own" ON public.location_reminders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "loc reminders update own" ON public.location_reminders
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "loc reminders delete own" ON public.location_reminders
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_location_reminders_user_artigo ON public.location_reminders(user_id, artigo_ref);
CREATE TRIGGER trg_location_reminders_updated_at
  BEFORE UPDATE ON public.location_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) article_time_reminders
CREATE TABLE public.article_time_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artigo_ref text NOT NULL,
  label text,
  message text,
  time_of_day time NOT NULL DEFAULT '09:00',
  days_of_week integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  channel text NOT NULL DEFAULT 'push',
  active boolean NOT NULL DEFAULT true,
  triggered_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.article_time_reminders TO authenticated;
GRANT ALL ON public.article_time_reminders TO service_role;
ALTER TABLE public.article_time_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time reminders select own" ON public.article_time_reminders
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "time reminders insert own" ON public.article_time_reminders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "time reminders update own" ON public.article_time_reminders
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "time reminders delete own" ON public.article_time_reminders
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_time_reminders_user_artigo ON public.article_time_reminders(user_id, artigo_ref);
CREATE TRIGGER trg_article_time_reminders_updated_at
  BEFORE UPDATE ON public.article_time_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) user_preferences (legacy highlights fallback)
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY,
  highlights jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user prefs select own" ON public.user_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user prefs insert own" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user prefs update own" ON public.user_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user prefs delete own" ON public.user_preferences
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
