CREATE TABLE public.apresentacoes_narradas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  livro_tabela TEXT NOT NULL,
  livro_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  capa_url TEXT,
  voz TEXT NOT NULL DEFAULT 'Charon',
  total_slides INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho',
  publicada BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apresentacoes_narradas TO anon;
GRANT SELECT ON public.apresentacoes_narradas TO authenticated;
GRANT ALL ON public.apresentacoes_narradas TO service_role;
ALTER TABLE public.apresentacoes_narradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apresentacoes publicadas sao publicas" ON public.apresentacoes_narradas FOR SELECT USING (publicada = true OR public.is_admin_user(auth.uid()));
CREATE POLICY "admins gerenciam apresentacoes" ON public.apresentacoes_narradas FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE INDEX idx_apresentacoes_livro ON public.apresentacoes_narradas(livro_tabela, livro_id);

CREATE TABLE public.apresentacao_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apresentacao_id UUID NOT NULL REFERENCES public.apresentacoes_narradas(id) ON DELETE CASCADE,
  slide_index INTEGER NOT NULL,
  imagem_path TEXT,
  imagem_url TEXT,
  texto_extraido TEXT,
  roteiro TEXT,
  audio_path TEXT,
  audio_url TEXT,
  duracao_segundos NUMERIC,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (apresentacao_id, slide_index)
);
GRANT SELECT ON public.apresentacao_slides TO anon;
GRANT SELECT ON public.apresentacao_slides TO authenticated;
GRANT ALL ON public.apresentacao_slides TO service_role;
ALTER TABLE public.apresentacao_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slides visiveis com a apresentacao" ON public.apresentacao_slides FOR SELECT USING (EXISTS (SELECT 1 FROM public.apresentacoes_narradas a WHERE a.id = apresentacao_id AND (a.publicada = true OR public.is_admin_user(auth.uid()))));
CREATE POLICY "admins gerenciam slides" ON public.apresentacao_slides FOR ALL TO authenticated USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TABLE public.apresentacao_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apresentacao_id UUID NOT NULL REFERENCES public.apresentacoes_narradas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (apresentacao_id, user_id)
);
GRANT SELECT ON public.apresentacao_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.apresentacao_likes TO authenticated;
GRANT ALL ON public.apresentacao_likes TO service_role;
ALTER TABLE public.apresentacao_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes sao publicos" ON public.apresentacao_likes FOR SELECT USING (true);
CREATE POLICY "usuario gerencia seus likes" ON public.apresentacao_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuario remove seus likes" ON public.apresentacao_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.apresentacao_favoritos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apresentacao_id UUID NOT NULL REFERENCES public.apresentacoes_narradas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (apresentacao_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.apresentacao_favoritos TO authenticated;
GRANT ALL ON public.apresentacao_favoritos TO service_role;
ALTER TABLE public.apresentacao_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario ve seus favoritos" ON public.apresentacao_favoritos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "usuario cria seus favoritos" ON public.apresentacao_favoritos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuario remove seus favoritos" ON public.apresentacao_favoritos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.apresentacao_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apresentacao_id UUID NOT NULL REFERENCES public.apresentacoes_narradas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apresentacao_comentarios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apresentacao_comentarios TO authenticated;
GRANT ALL ON public.apresentacao_comentarios TO service_role;
ALTER TABLE public.apresentacao_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comentarios sao publicos" ON public.apresentacao_comentarios FOR SELECT USING (true);
CREATE POLICY "usuario comenta" ON public.apresentacao_comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuario edita seu comentario" ON public.apresentacao_comentarios FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuario ou admin apaga comentario" ON public.apresentacao_comentarios FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_apresentacoes_updated BEFORE UPDATE ON public.apresentacoes_narradas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apresentacao_slides_updated BEFORE UPDATE ON public.apresentacao_slides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apresentacao_comentarios_updated BEFORE UPDATE ON public.apresentacao_comentarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();