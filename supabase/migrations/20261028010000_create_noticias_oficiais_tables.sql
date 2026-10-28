-- ==============================================================================
-- Migração: Tabelas de Notícias Oficiais (STF, Câmara dos Deputados, Senado Federal)
-- ==============================================================================

-- 1. STF (Supremo Tribunal Federal)
CREATE TABLE IF NOT EXISTS public.noticias_stf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo_md TEXT,
  imagem_url TEXT,
  categoria TEXT DEFAULT 'STF',
  link TEXT NOT NULL UNIQUE,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS noticias_stf_data_idx ON public.noticias_stf (data_publicacao DESC);
CREATE INDEX IF NOT EXISTS noticias_stf_link_idx ON public.noticias_stf (link);

GRANT SELECT ON public.noticias_stf TO anon;
GRANT SELECT ON public.noticias_stf TO authenticated;
GRANT ALL ON public.noticias_stf TO service_role;

ALTER TABLE public.noticias_stf ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'noticias_stf' AND policyname = 'noticias_stf leitura publica'
  ) THEN
    CREATE POLICY "noticias_stf leitura publica" ON public.noticias_stf FOR SELECT USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_noticias_stf_updated ON public.noticias_stf;
CREATE TRIGGER trg_noticias_stf_updated
  BEFORE UPDATE ON public.noticias_stf
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. CÂMARA DOS DEPUTADOS
CREATE TABLE IF NOT EXISTS public.noticias_camara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo_md TEXT,
  imagem_url TEXT,
  categoria TEXT DEFAULT 'Câmara dos Deputados',
  link TEXT NOT NULL UNIQUE,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS noticias_camara_data_idx ON public.noticias_camara (data_publicacao DESC);
CREATE INDEX IF NOT EXISTS noticias_camara_link_idx ON public.noticias_camara (link);

GRANT SELECT ON public.noticias_camara TO anon;
GRANT SELECT ON public.noticias_camara TO authenticated;
GRANT ALL ON public.noticias_camara TO service_role;

ALTER TABLE public.noticias_camara ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'noticias_camara' AND policyname = 'noticias_camara leitura publica'
  ) THEN
    CREATE POLICY "noticias_camara leitura publica" ON public.noticias_camara FOR SELECT USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_noticias_camara_updated ON public.noticias_camara;
CREATE TRIGGER trg_noticias_camara_updated
  BEFORE UPDATE ON public.noticias_camara
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. SENADO FEDERAL
CREATE TABLE IF NOT EXISTS public.noticias_senado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo_md TEXT,
  imagem_url TEXT,
  categoria TEXT DEFAULT 'Senado Federal',
  link TEXT NOT NULL UNIQUE,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS noticias_senado_data_idx ON public.noticias_senado (data_publicacao DESC);
CREATE INDEX IF NOT EXISTS noticias_senado_link_idx ON public.noticias_senado (link);

GRANT SELECT ON public.noticias_senado TO anon;
GRANT SELECT ON public.noticias_senado TO authenticated;
GRANT ALL ON public.noticias_senado TO service_role;

ALTER TABLE public.noticias_senado ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'noticias_senado' AND policyname = 'noticias_senado leitura publica'
  ) THEN
    CREATE POLICY "noticias_senado leitura publica" ON public.noticias_senado FOR SELECT USING (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_noticias_senado_updated ON public.noticias_senado;
CREATE TRIGGER trg_noticias_senado_updated
  BEFORE UPDATE ON public.noticias_senado
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
