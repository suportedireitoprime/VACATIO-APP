CREATE TABLE public.sumulas_stj (
  numero INTEGER PRIMARY KEY,
  enunciado TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'vigente',
  orgao_julgador TEXT,
  data_publicacao DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sumulas_stj TO anon, authenticated;
GRANT ALL ON public.sumulas_stj TO service_role;

ALTER TABLE public.sumulas_stj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Súmulas STJ são públicas para leitura"
  ON public.sumulas_stj FOR SELECT
  USING (true);

CREATE TRIGGER update_sumulas_stj_updated_at
  BEFORE UPDATE ON public.sumulas_stj
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();