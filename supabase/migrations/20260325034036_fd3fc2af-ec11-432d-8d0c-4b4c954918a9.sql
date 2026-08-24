
CREATE TABLE public.decretos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lei text NOT NULL,
  data_publicacao text,
  ementa text NOT NULL DEFAULT '',
  url text,
  ano integer NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  texto_completo text
);

CREATE INDEX idx_decretos_ano_ordem ON public.decretos (ano, ordem);

ALTER TABLE public.decretos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública decretos" ON public.decretos FOR SELECT TO public USING (true);
CREATE POLICY "Inserção decretos" ON public.decretos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção decretos" ON public.decretos FOR DELETE TO public USING (true);
