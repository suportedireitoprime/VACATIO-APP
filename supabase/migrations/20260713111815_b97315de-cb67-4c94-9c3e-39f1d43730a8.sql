
-- Notícias jurídicas (Migalhas + futuras fontes)
CREATE TABLE IF NOT EXISTS public.noticias_juridicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte TEXT NOT NULL DEFAULT 'migalhas',
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo_md TEXT,
  imagem_url TEXT,
  categoria TEXT,
  link TEXT NOT NULL UNIQUE,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS noticias_juridicas_data_idx ON public.noticias_juridicas (data_publicacao DESC);
CREATE INDEX IF NOT EXISTS noticias_juridicas_fonte_idx ON public.noticias_juridicas (fonte);

GRANT SELECT ON public.noticias_juridicas TO anon;
GRANT SELECT ON public.noticias_juridicas TO authenticated;
GRANT ALL ON public.noticias_juridicas TO service_role;

ALTER TABLE public.noticias_juridicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "noticias_juridicas leitura publica" ON public.noticias_juridicas
  FOR SELECT USING (true);

CREATE TRIGGER trg_noticias_juridicas_updated
  BEFORE UPDATE ON public.noticias_juridicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários (funciona para ambas fontes: string 'juridica:<id>' ou 'camara:<id>')
CREATE TABLE IF NOT EXISTS public.noticias_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  noticia_ref TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_nome TEXT,
  comentario TEXT NOT NULL CHECK (char_length(comentario) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS noticias_comentarios_ref_idx ON public.noticias_comentarios (noticia_ref, created_at DESC);

GRANT SELECT ON public.noticias_comentarios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noticias_comentarios TO authenticated;
GRANT ALL ON public.noticias_comentarios TO service_role;

ALTER TABLE public.noticias_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coment leitura publica" ON public.noticias_comentarios
  FOR SELECT USING (true);
CREATE POLICY "coment inserir logado" ON public.noticias_comentarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coment editar dono" ON public.noticias_comentarios
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coment apagar dono" ON public.noticias_comentarios
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_noticias_comentarios_updated
  BEFORE UPDATE ON public.noticias_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
