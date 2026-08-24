CREATE TABLE public.sumulas_vinculantes (
  numero INTEGER PRIMARY KEY,
  enunciado TEXT NOT NULL DEFAULT '',
  situacao TEXT NOT NULL DEFAULT 'vigente',
  data_publicacao TEXT,
  referencia TEXT,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sumulas_vinculantes TO anon, authenticated;
GRANT ALL ON public.sumulas_vinculantes TO service_role;

ALTER TABLE public.sumulas_vinculantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sumulas_vinculantes"
  ON public.sumulas_vinculantes FOR SELECT
  USING (true);

CREATE TRIGGER trg_sumulas_vinculantes_updated
  BEFORE UPDATE ON public.sumulas_vinculantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();