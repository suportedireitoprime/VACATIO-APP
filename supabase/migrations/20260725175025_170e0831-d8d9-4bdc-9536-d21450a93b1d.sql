CREATE TABLE public.jurisprudencia_teses_edicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tribunal text NOT NULL DEFAULT 'STJ',
  edicao integer NOT NULL,
  titulo text NOT NULL,
  ramo text,
  data_publicacao text,
  total_teses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tribunal, edicao)
);

CREATE TABLE public.jurisprudencia_teses_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id uuid NOT NULL REFERENCES public.jurisprudencia_teses_edicoes(id) ON DELETE CASCADE,
  tribunal text NOT NULL DEFAULT 'STJ',
  edicao integer NOT NULL,
  numero integer NOT NULL,
  tese text NOT NULL,
  julgados text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edicao_id, numero)
);

CREATE INDEX idx_teses_itens_edicao ON public.jurisprudencia_teses_itens(edicao_id);
CREATE INDEX idx_teses_edicoes_trib ON public.jurisprudencia_teses_edicoes(tribunal, edicao);

GRANT SELECT ON public.jurisprudencia_teses_edicoes TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_teses_edicoes TO service_role;
GRANT SELECT ON public.jurisprudencia_teses_itens TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_teses_itens TO service_role;

ALTER TABLE public.jurisprudencia_teses_edicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisprudencia_teses_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teses edicoes sao publicas" ON public.jurisprudencia_teses_edicoes FOR SELECT USING (true);
CREATE POLICY "Teses itens sao publicos" ON public.jurisprudencia_teses_itens FOR SELECT USING (true);

CREATE TRIGGER trg_teses_edicoes_updated BEFORE UPDATE ON public.jurisprudencia_teses_edicoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_teses_itens_updated BEFORE UPDATE ON public.jurisprudencia_teses_itens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();