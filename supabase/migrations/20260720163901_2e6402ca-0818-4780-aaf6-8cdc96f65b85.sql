
CREATE TABLE IF NOT EXISTS public.app_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_name_created ON public.app_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_user ON public.app_events(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.app_events TO authenticated;
GRANT SELECT ON public.app_events TO anon;
GRANT ALL ON public.app_events TO service_role;

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events" ON public.app_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can read events" ON public.app_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) IN ('wn7corporation@gmail.com','suporte.vacatio@gmail.com')
    )
  );
