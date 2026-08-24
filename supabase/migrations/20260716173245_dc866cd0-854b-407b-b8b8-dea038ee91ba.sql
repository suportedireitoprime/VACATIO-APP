
CREATE TABLE public.artigo_videoaulas_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_codigo text NOT NULL,
  numero_artigo text NOT NULL,
  videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artigo_videoaulas_cache_unique UNIQUE (tabela_codigo, numero_artigo)
);

GRANT SELECT ON public.artigo_videoaulas_cache TO authenticated;
GRANT ALL ON public.artigo_videoaulas_cache TO service_role;

ALTER TABLE public.artigo_videoaulas_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read videoaulas cache"
  ON public.artigo_videoaulas_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages videoaulas cache"
  ON public.artigo_videoaulas_cache FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS artigo_videoaulas_cache_lookup_idx
  ON public.artigo_videoaulas_cache (tabela_codigo, numero_artigo);

CREATE TRIGGER artigo_videoaulas_cache_touch
  BEFORE UPDATE ON public.artigo_videoaulas_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
