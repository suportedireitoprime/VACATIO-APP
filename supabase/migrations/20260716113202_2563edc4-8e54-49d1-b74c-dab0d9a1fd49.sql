
-- 1) biblioteca_portugues
CREATE TABLE IF NOT EXISTS public.biblioteca_portugues (
  id bigint PRIMARY KEY,
  livro text,
  autor text,
  area text,
  imagem text,
  download text,
  link text,
  sobre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_portugues TO anon, authenticated;
GRANT ALL ON public.biblioteca_portugues TO service_role;
ALTER TABLE public.biblioteca_portugues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biblioteca_portugues public read"
  ON public.biblioteca_portugues FOR SELECT TO anon, authenticated USING (true);

-- 2) biblioteca_pesquisa_cientifica
CREATE TABLE IF NOT EXISTS public.biblioteca_pesquisa_cientifica (
  id bigint PRIMARY KEY,
  livro text,
  autor text,
  area text,
  imagem text,
  download text,
  link text,
  sobre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_pesquisa_cientifica TO anon, authenticated;
GRANT ALL ON public.biblioteca_pesquisa_cientifica TO service_role;
ALTER TABLE public.biblioteca_pesquisa_cientifica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biblioteca_pesquisa public read"
  ON public.biblioteca_pesquisa_cientifica FOR SELECT TO anon, authenticated USING (true);

-- 3) biblioteca_oab
CREATE TABLE IF NOT EXISTS public.biblioteca_oab (
  id bigint PRIMARY KEY,
  tema text,
  area text,
  capa_livro text,
  capa_area text,
  ordem numeric,
  download text,
  link text,
  sobre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_oab TO anon, authenticated;
GRANT ALL ON public.biblioteca_oab TO service_role;
ALTER TABLE public.biblioteca_oab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "biblioteca_oab public read"
  ON public.biblioteca_oab FOR SELECT TO anon, authenticated USING (true);
