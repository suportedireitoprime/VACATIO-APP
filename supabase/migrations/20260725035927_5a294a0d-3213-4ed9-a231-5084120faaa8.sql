CREATE TABLE public.dicionario_juridico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letra text NOT NULL,
  palavra text NOT NULL,
  significado text NOT NULL,
  exemplo_pratico text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (letra, palavra)
);

GRANT SELECT ON public.dicionario_juridico TO anon, authenticated;
GRANT ALL ON public.dicionario_juridico TO service_role;

ALTER TABLE public.dicionario_juridico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dicionario is public read"
  ON public.dicionario_juridico
  FOR SELECT
  USING (true);

CREATE INDEX dicionario_juridico_letra_idx ON public.dicionario_juridico (letra);
CREATE INDEX dicionario_juridico_palavra_idx ON public.dicionario_juridico (palavra);

CREATE TRIGGER trg_dicionario_juridico_updated
  BEFORE UPDATE ON public.dicionario_juridico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();