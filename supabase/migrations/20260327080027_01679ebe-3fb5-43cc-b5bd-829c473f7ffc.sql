
CREATE TABLE public.sumulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tribunal text NOT NULL,
  numero integer NOT NULL,
  enunciado text NOT NULL DEFAULT '',
  situacao text NOT NULL DEFAULT 'vigente',
  data_publicacao text,
  referencia text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tribunal, numero)
);

CREATE INDEX idx_sumulas_tribunal ON public.sumulas(tribunal);
CREATE INDEX idx_sumulas_tribunal_numero ON public.sumulas(tribunal, numero);

ALTER TABLE public.sumulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública sumulas" ON public.sumulas FOR SELECT TO public USING (true);
CREATE POLICY "Inserção sumulas" ON public.sumulas FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção sumulas" ON public.sumulas FOR DELETE TO public USING (true);
CREATE POLICY "Atualização sumulas" ON public.sumulas FOR UPDATE TO public USING (true) WITH CHECK (true);
