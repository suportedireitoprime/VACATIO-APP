CREATE TABLE public.dicionario_termo_stats (
  palavra text PRIMARY KEY,
  clicks bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dicionario_termo_stats TO anon, authenticated;
GRANT ALL ON public.dicionario_termo_stats TO service_role;

ALTER TABLE public.dicionario_termo_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stats_read_all" ON public.dicionario_termo_stats
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.increment_dicionario_click(p_palavra text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dicionario_termo_stats (palavra, clicks, updated_at)
  VALUES (p_palavra, 1, now())
  ON CONFLICT (palavra) DO UPDATE
    SET clicks = public.dicionario_termo_stats.clicks + 1,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_dicionario_click(text) TO anon, authenticated;