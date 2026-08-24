CREATE TABLE public.sumulas_stf (
  numero integer PRIMARY KEY,
  enunciado text NOT NULL,
  situacao text NOT NULL DEFAULT 'vigente',
  orgao_julgador text,
  ramo_direito text,
  data_aprovacao date,
  fonte_publicacao text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sumulas_stf TO anon, authenticated;
GRANT ALL ON public.sumulas_stf TO service_role;

ALTER TABLE public.sumulas_stf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Súmulas STF são públicas para leitura"
ON public.sumulas_stf FOR SELECT USING (true);

CREATE TRIGGER update_sumulas_stf_updated_at
BEFORE UPDATE ON public.sumulas_stf
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();