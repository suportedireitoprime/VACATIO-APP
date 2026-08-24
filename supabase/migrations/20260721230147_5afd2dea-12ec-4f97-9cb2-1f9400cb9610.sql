
CREATE TABLE public.user_activity_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  device_hint TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity_state TO authenticated;
GRANT ALL ON public.user_activity_state TO service_role;

ALTER TABLE public.user_activity_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own activity state"
  ON public.user_activity_state
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
