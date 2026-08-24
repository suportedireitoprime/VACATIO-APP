ALTER TABLE public.jurisprudencia_prontas_resultados
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS url_pdf text;