CREATE TABLE public.location_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  address text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_m integer NOT NULL DEFAULT 300,
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  triggered_count integer NOT NULL DEFAULT 0,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_reminders TO authenticated;
GRANT ALL ON public.location_reminders TO service_role;

ALTER TABLE public.location_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own location reminders"
  ON public.location_reminders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_location_reminders_user ON public.location_reminders(user_id) WHERE active = true;

CREATE OR REPLACE FUNCTION public.update_location_reminders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_location_reminders_updated
  BEFORE UPDATE ON public.location_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_location_reminders_updated_at();

-- Áudios gravados (resumos falados)
CREATE TABLE public.audio_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Gravação',
  duration_ms integer NOT NULL DEFAULT 0,
  local_path text,
  transcript text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_recordings TO authenticated;
GRANT ALL ON public.audio_recordings TO service_role;

ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audio recordings"
  ON public.audio_recordings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_audio_recordings_updated
  BEFORE UPDATE ON public.audio_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_location_reminders_updated_at();