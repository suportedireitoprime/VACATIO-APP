CREATE TABLE IF NOT EXISTS public.notification_read_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT 'epoch'::timestamptz,
  opened_ids text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_read_state TO authenticated;
GRANT ALL ON public.notification_read_state TO service_role;

ALTER TABLE public.notification_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notification state" ON public.notification_read_state;
CREATE POLICY "Users can read own notification state"
  ON public.notification_read_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification state" ON public.notification_read_state;
CREATE POLICY "Users can insert own notification state"
  ON public.notification_read_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification state" ON public.notification_read_state;
CREATE POLICY "Users can update own notification state"
  ON public.notification_read_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS notification_read_state_set_updated_at ON public.notification_read_state;
CREATE TRIGGER notification_read_state_set_updated_at
  BEFORE UPDATE ON public.notification_read_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();