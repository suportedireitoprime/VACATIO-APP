
CREATE TABLE IF NOT EXISTS public.biblioteca_capa_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  livro_id text NOT NULL,
  titulo text,
  autor text,
  capa_url text,
  prompt_used text,
  rating smallint NOT NULL CHECK (rating IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capa_feedback_rating_created ON public.biblioteca_capa_feedback (rating, created_at DESC);
GRANT SELECT ON public.biblioteca_capa_feedback TO authenticated;
GRANT ALL ON public.biblioteca_capa_feedback TO service_role;
ALTER TABLE public.biblioteca_capa_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read feedback" ON public.biblioteca_capa_feedback FOR SELECT TO authenticated USING (true);
