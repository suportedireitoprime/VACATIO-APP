CREATE TABLE public.artigo_ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  modo text NOT NULL CHECK (modo IN ('explicacao', 'exemplo', 'termos')),
  conteudo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tabela_nome, artigo_numero, modo)
);

ALTER TABLE public.artigo_ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read AI cache"
  ON public.artigo_ai_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert AI cache"
  ON public.artigo_ai_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);