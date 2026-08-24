CREATE TABLE public.tematica_juridica_obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('movie','tv')),
  titulo TEXT NOT NULL,
  titulo_original TEXT,
  sinopse TEXT,
  ano INTEGER,
  nota NUMERIC(3,1),
  duracao_min INTEGER,
  poster_url TEXT,
  backdrop_url TEXT,
  trailer_youtube_id TEXT,
  generos TEXT[] DEFAULT '{}',
  categorias_juridicas TEXT[] DEFAULT '{}',
  elenco JSONB DEFAULT '[]'::jsonb,
  providers JSONB DEFAULT '{}'::jsonb,
  homepage TEXT,
  destaque BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tmdb_id, tipo)
);

GRANT SELECT ON public.tematica_juridica_obras TO anon;
GRANT SELECT ON public.tematica_juridica_obras TO authenticated;
GRANT ALL ON public.tematica_juridica_obras TO service_role;

ALTER TABLE public.tematica_juridica_obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Obras jurídicas são públicas para leitura"
  ON public.tematica_juridica_obras
  FOR SELECT
  USING (ativo = true);

CREATE TRIGGER update_tematica_juridica_obras_updated_at
  BEFORE UPDATE ON public.tematica_juridica_obras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tematica_juridica_obras_tipo ON public.tematica_juridica_obras(tipo);
CREATE INDEX idx_tematica_juridica_obras_ordem ON public.tematica_juridica_obras(ordem);
CREATE INDEX idx_tematica_juridica_obras_categorias ON public.tematica_juridica_obras USING GIN(categorias_juridicas);