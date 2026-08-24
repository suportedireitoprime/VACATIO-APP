CREATE TABLE IF NOT EXISTS public.noticias_camara (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text DEFAULT '',
  conteudo text DEFAULT '',
  imagem_url text,
  categoria text DEFAULT '',
  link text UNIQUE NOT NULL,
  data_publicacao timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.noticias_camara ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública noticias" ON public.noticias_camara FOR SELECT TO public USING (true);
CREATE POLICY "Inserção noticias" ON public.noticias_camara FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção noticias" ON public.noticias_camara FOR DELETE TO public USING (true);