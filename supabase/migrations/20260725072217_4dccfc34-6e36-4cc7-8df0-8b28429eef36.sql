ALTER TABLE public.jurisprudencia_prontas_resultados
  ADD COLUMN IF NOT EXISTS ementa_refinada TEXT,
  ADD COLUMN IF NOT EXISTS observacao_refinada TEXT,
  ADD COLUMN IF NOT EXISTS refinado_em TIMESTAMPTZ;