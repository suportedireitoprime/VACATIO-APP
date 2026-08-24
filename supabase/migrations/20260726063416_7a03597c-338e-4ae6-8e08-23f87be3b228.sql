
-- 1. TTL do QR para 60s
ALTER TABLE public.desktop_link_tokens
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 minute');

ALTER TABLE public.desktop_link_tokens
  ADD COLUMN IF NOT EXISTS desktop_id text;

-- 2. Tabela de sessões desktop
CREATE TABLE IF NOT EXISTS public.desktop_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  desktop_id text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS desktop_sessions_user_active_idx
  ON public.desktop_sessions (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS desktop_sessions_expires_idx
  ON public.desktop_sessions (expires_at);

GRANT SELECT ON public.desktop_sessions TO authenticated;
GRANT ALL ON public.desktop_sessions TO service_role;

ALTER TABLE public.desktop_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_desktop_sessions_select"
  ON public.desktop_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
