
CREATE TABLE public.noticias_camara (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text,
  conteudo text,
  imagem_url text,
  categoria text,
  link text NOT NULL UNIQUE,
  data_publicacao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.noticias_camara TO anon;
GRANT SELECT ON public.noticias_camara TO authenticated;
GRANT ALL ON public.noticias_camara TO service_role;

ALTER TABLE public.noticias_camara ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notícias são públicas para leitura"
  ON public.noticias_camara FOR SELECT
  USING (true);

CREATE INDEX idx_noticias_camara_data ON public.noticias_camara (data_publicacao DESC);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
