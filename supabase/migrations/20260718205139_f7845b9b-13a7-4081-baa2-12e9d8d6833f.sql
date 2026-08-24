
CREATE TABLE public.hero_motifs_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  slots_count smallint NOT NULL DEFAULT 12 CHECK (slots_count BETWEEN 4 AND 12),
  interval_ms integer NOT NULL DEFAULT 3000 CHECK (interval_ms BETWEEN 500 AND 60000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_motifs_config TO anon, authenticated;
GRANT ALL ON public.hero_motifs_config TO service_role;

ALTER TABLE public.hero_motifs_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hero motifs config"
  ON public.hero_motifs_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert hero motifs config"
  ON public.hero_motifs_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update hero motifs config"
  ON public.hero_motifs_config FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

INSERT INTO public.hero_motifs_config (id, slots_count, interval_ms)
VALUES (1, 12, 3000)
ON CONFLICT (id) DO NOTHING;
