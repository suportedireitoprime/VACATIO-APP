CREATE TABLE public.constituicoes_estaduais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf text NOT NULL,
  numero text NOT NULL,
  rotulo text,
  texto text NOT NULL DEFAULT '',
  caput text NOT NULL DEFAULT '',
  ordem_numero numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  titulo text,
  capitulo text,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_constituicoes_estaduais_uf ON public.constituicoes_estaduais(uf);
CREATE INDEX idx_constituicoes_estaduais_ordem ON public.constituicoes_estaduais(uf, ordem_numero);

ALTER TABLE public.constituicoes_estaduais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública constituicoes_estaduais" ON public.constituicoes_estaduais FOR SELECT TO public USING (true);
CREATE POLICY "Inserção constituicoes_estaduais" ON public.constituicoes_estaduais FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção constituicoes_estaduais" ON public.constituicoes_estaduais FOR DELETE TO public USING (true);