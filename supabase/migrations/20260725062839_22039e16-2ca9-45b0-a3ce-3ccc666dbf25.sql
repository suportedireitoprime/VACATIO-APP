
CREATE TABLE public.jurisprudencia_prontas_resultados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pesquisa_id UUID NOT NULL REFERENCES public.jurisprudencia_prontas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  orgao TEXT,
  relator TEXT,
  data_julgamento TEXT,
  data_publicacao TEXT,
  ementa TEXT,
  url_inteiro_teor TEXT,
  raw JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_jpr_resultados_pesquisa ON public.jurisprudencia_prontas_resultados(pesquisa_id, ordem);
CREATE INDEX idx_jpr_resultados_fetched ON public.jurisprudencia_prontas_resultados(pesquisa_id, fetched_at DESC);

GRANT SELECT ON public.jurisprudencia_prontas_resultados TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_prontas_resultados TO service_role;

ALTER TABLE public.jurisprudencia_prontas_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read jpr_resultados"
  ON public.jurisprudencia_prontas_resultados
  FOR SELECT
  USING (true);
