CREATE TABLE public.radar_pl_headlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_externo text NOT NULL UNIQUE,
  headline text,
  analise text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.radar_pl_headlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read PL headlines" ON public.radar_pl_headlines
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public insert PL headlines" ON public.radar_pl_headlines
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update PL headlines" ON public.radar_pl_headlines
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);