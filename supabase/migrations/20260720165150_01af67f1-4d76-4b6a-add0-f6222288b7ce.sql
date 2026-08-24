
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  display_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  initial_route TEXT,
  platform TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_started ON public.user_sessions (user_id, started_at DESC);
CREATE INDEX idx_user_sessions_started ON public.user_sessions (started_at DESC);

GRANT SELECT, INSERT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own sessions"
  ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read their own sessions"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all sessions"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));
