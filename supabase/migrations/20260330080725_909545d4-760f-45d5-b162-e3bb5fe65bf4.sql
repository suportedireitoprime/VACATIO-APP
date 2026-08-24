CREATE TABLE public.artigo_educacional_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  titulo text NOT NULL,
  categoria text NOT NULL,
  conteudo_md text NOT NULL DEFAULT '',
  fontes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.artigo_educacional_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica artigos educacionais" ON public.artigo_educacional_cache
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Insercao artigos educacionais" ON public.artigo_educacional_cache
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Atualizacao artigos educacionais" ON public.artigo_educacional_cache
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);