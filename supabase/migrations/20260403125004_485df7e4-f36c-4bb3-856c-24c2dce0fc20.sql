
-- Clássicos
CREATE TABLE IF NOT EXISTS public.biblioteca_classicos (
  id integer PRIMARY KEY,
  livro text,
  autor text,
  area text,
  sobre text,
  imagem text,
  "capa_area" text,
  download text,
  link text,
  aula text,
  beneficios text,
  resumo_capitulos jsonb,
  questoes_resumo jsonb,
  resumo_gerado_em text,
  analise_status text,
  capitulos_gerados integer,
  total_capitulos integer,
  total_paginas integer,
  total_temas integer,
  url_videoaula text,
  url_capa_gerada text
);
ALTER TABLE public.biblioteca_classicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read biblioteca_classicos" ON public.biblioteca_classicos FOR SELECT USING (true);

-- Estudos
CREATE TABLE IF NOT EXISTS public.biblioteca_estudos (
  id integer PRIMARY KEY,
  tema text,
  area text,
  capa_area text,
  capa_livro text,
  download text,
  link text,
  sobre text,
  aula text,
  ordem integer,
  url_capa_gerada text
);
ALTER TABLE public.biblioteca_estudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read biblioteca_estudos" ON public.biblioteca_estudos FOR SELECT USING (true);

-- Fora da Toga
CREATE TABLE IF NOT EXISTS public.biblioteca_fora_da_toga (
  id integer PRIMARY KEY,
  livro text,
  autor text,
  area text,
  capa_area text,
  capa_livro text,
  download text,
  link text,
  sobre text,
  aula text
);
ALTER TABLE public.biblioteca_fora_da_toga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read biblioteca_fora_da_toga" ON public.biblioteca_fora_da_toga FOR SELECT USING (true);

-- Liderança
CREATE TABLE IF NOT EXISTS public.biblioteca_lideranca (
  id integer PRIMARY KEY,
  livro text,
  autor text,
  area text,
  capa_area text,
  imagem text,
  download text,
  link text,
  sobre text,
  aula text,
  beneficios text,
  resumo_capitulos jsonb,
  questoes_resumo jsonb,
  resumo_gerado_em text
);
ALTER TABLE public.biblioteca_lideranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read biblioteca_lideranca" ON public.biblioteca_lideranca FOR SELECT USING (true);

-- Contribuições
CREATE TABLE IF NOT EXISTS public.biblioteca_contribuicoes (
  id serial PRIMARY KEY,
  livro text NOT NULL,
  autor text,
  area text,
  download text,
  imagem text,
  sobre text,
  formato text,
  idioma text,
  tamanho text,
  md5 text,
  aprovado boolean DEFAULT false,
  contribuidor_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.biblioteca_contribuicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read biblioteca_contribuicoes" ON public.biblioteca_contribuicoes FOR SELECT USING (true);

-- Leitura Dinâmica
CREATE TABLE IF NOT EXISTS public.biblioteca_leitura_dinamica (
  id serial PRIMARY KEY,
  titulo_obra text,
  titulo_capitulo text,
  pagina integer,
  conteudo text
);
ALTER TABLE public.biblioteca_leitura_dinamica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read biblioteca_leitura_dinamica" ON public.biblioteca_leitura_dinamica FOR SELECT USING (true);

-- Clássicos Páginas
CREATE TABLE IF NOT EXISTS public.ext_biblioteca_classicos_paginas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id integer NOT NULL,
  pagina integer NOT NULL,
  conteudo text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ext_biblioteca_classicos_paginas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ext_biblioteca_classicos_paginas" ON public.ext_biblioteca_classicos_paginas FOR SELECT USING (true);

-- Clássicos Temas
CREATE TABLE IF NOT EXISTS public.ext_biblioteca_classicos_temas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id integer NOT NULL,
  titulo_tema text,
  conteudo_markdown text,
  audio_url text,
  capa_url text,
  correspondencias jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ext_biblioteca_classicos_temas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ext_biblioteca_classicos_temas" ON public.ext_biblioteca_classicos_temas FOR SELECT USING (true);

-- Atualização Biblioteca (novidades)
CREATE TABLE IF NOT EXISTS public.ext_atualizacao_biblioteca (
  id serial PRIMARY KEY,
  nome_livro text NOT NULL,
  autor text NOT NULL,
  biblioteca text NOT NULL,
  capa_url text,
  ativo boolean DEFAULT true,
  vezes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ext_atualizacao_biblioteca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ext_atualizacao_biblioteca" ON public.ext_atualizacao_biblioteca FOR SELECT USING (true);

-- Bucket para PDFs importados
INSERT INTO storage.buckets (id, name, public) VALUES ('biblioteca-externa', 'biblioteca-externa', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read biblioteca-externa" ON storage.objects FOR SELECT USING (bucket_id = 'biblioteca-externa');
