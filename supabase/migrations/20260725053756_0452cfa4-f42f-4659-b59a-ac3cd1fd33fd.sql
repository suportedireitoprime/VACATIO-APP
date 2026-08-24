CREATE TABLE public.jurisprudencia_prontas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tribunal text NOT NULL CHECK (tribunal IN ('STF','STJ')),
  ramo text NOT NULL,
  assunto text,
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  query_url text NOT NULL,
  query_string text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jurisprudencia_prontas_tribunal_ramo ON public.jurisprudencia_prontas (tribunal, ramo, ordem);
CREATE INDEX idx_jurisprudencia_prontas_slug ON public.jurisprudencia_prontas (slug);

GRANT SELECT ON public.jurisprudencia_prontas TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_prontas TO service_role;

ALTER TABLE public.jurisprudencia_prontas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read jurisprudencia_prontas"
  ON public.jurisprudencia_prontas
  FOR SELECT
  USING (true);

CREATE TRIGGER trg_jurisprudencia_prontas_updated
  BEFORE UPDATE ON public.jurisprudencia_prontas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();