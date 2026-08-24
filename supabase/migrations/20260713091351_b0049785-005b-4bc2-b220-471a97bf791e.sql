
-- artigo_educacional_cache
CREATE TABLE IF NOT EXISTS public.artigo_educacional_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  conteudo_md text,
  fontes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artigo_educacional_cache TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigo_educacional_cache TO authenticated;
GRANT ALL ON public.artigo_educacional_cache TO service_role;
ALTER TABLE public.artigo_educacional_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cache" ON public.artigo_educacional_cache FOR SELECT USING (true);
CREATE POLICY "Auth write cache" ON public.artigo_educacional_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update cache" ON public.artigo_educacional_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- biblioteca_favoritos
CREATE TABLE IF NOT EXISTS public.biblioteca_favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  livro_key text NOT NULL,
  categoria text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, livro_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_favoritos TO authenticated;
GRANT ALL ON public.biblioteca_favoritos TO service_role;
ALTER TABLE public.biblioteca_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own favs" ON public.biblioteca_favoritos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- biblioteca_livros
CREATE TABLE IF NOT EXISTS public.biblioteca_livros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  autor text,
  total_paginas integer DEFAULT 0,
  ultima_pagina integer DEFAULT 0,
  conteudo jsonb,
  estrutura_leitura jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_livros TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_livros TO authenticated;
GRANT ALL ON public.biblioteca_livros TO service_role;
ALTER TABLE public.biblioteca_livros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read livros" ON public.biblioteca_livros FOR SELECT USING (true);

-- biblioteca_classicos / lideranca / fora_da_toga (mesmo shape)
CREATE TABLE IF NOT EXISTS public.biblioteca_classicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro text, autor text, imagem text, sobre text, download text, link text, area text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_classicos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_classicos TO authenticated;
GRANT ALL ON public.biblioteca_classicos TO service_role;
ALTER TABLE public.biblioteca_classicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read classicos" ON public.biblioteca_classicos FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.biblioteca_lideranca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro text, autor text, imagem text, sobre text, download text, link text, area text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_lideranca TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_lideranca TO authenticated;
GRANT ALL ON public.biblioteca_lideranca TO service_role;
ALTER TABLE public.biblioteca_lideranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lideranca" ON public.biblioteca_lideranca FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.biblioteca_fora_da_toga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro text, autor text, capa_livro text, sobre text, download text, link text, area text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_fora_da_toga TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_fora_da_toga TO authenticated;
GRANT ALL ON public.biblioteca_fora_da_toga TO service_role;
ALTER TABLE public.biblioteca_fora_da_toga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fora_da_toga" ON public.biblioteca_fora_da_toga FOR SELECT USING (true);

-- biblioteca_estudos (usa 'tema' em vez de 'livro')
CREATE TABLE IF NOT EXISTS public.biblioteca_estudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema text, area text, capa_livro text, sobre text, download text, link text, ordem integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biblioteca_estudos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_estudos TO authenticated;
GRANT ALL ON public.biblioteca_estudos TO service_role;
ALTER TABLE public.biblioteca_estudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read estudos" ON public.biblioteca_estudos FOR SELECT USING (true);
