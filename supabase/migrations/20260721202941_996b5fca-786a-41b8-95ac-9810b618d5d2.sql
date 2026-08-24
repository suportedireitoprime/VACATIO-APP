
CREATE TABLE IF NOT EXISTS public.trial_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano text NOT NULL,
  trial_days int NOT NULL,
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL,
  reminder_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  channels jsonb NOT NULL DEFAULT '{"push": true, "banner": true, "whatsapp": true}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.trial_reminders TO authenticated;
GRANT ALL ON public.trial_reminders TO service_role;

ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own trial reminders"
  ON public.trial_reminders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user inserts own trial reminders"
  ON public.trial_reminders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user updates own trial reminders"
  ON public.trial_reminders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS trial_reminders_due_idx
  ON public.trial_reminders (reminder_at)
  WHERE status = 'scheduled';

DO $$
BEGIN
  PERFORM cron.unschedule('trial-reminders-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'trial-reminders-tick',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ea1ac531-2daa-4ac2-bb3f-7623684cf67b.supabase.co/functions/v1/trial-reminders-tick',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := '{}'::jsonb
  );
  $$
);
