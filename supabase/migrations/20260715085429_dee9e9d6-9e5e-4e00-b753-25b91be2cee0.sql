
CREATE TABLE public.reels_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_nome TEXT,
  autor_avatar TEXT,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reels_comentarios_video ON public.reels_comentarios(video_id, created_at DESC);
GRANT SELECT ON public.reels_comentarios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels_comentarios TO authenticated;
GRANT ALL ON public.reels_comentarios TO service_role;
ALTER TABLE public.reels_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels_com_read_all" ON public.reels_comentarios FOR SELECT USING (true);
CREATE POLICY "reels_com_insert_own" ON public.reels_comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reels_com_delete_own" ON public.reels_comentarios FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reels_curtidas (
  video_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
GRANT SELECT ON public.reels_curtidas TO anon;
GRANT SELECT, INSERT, DELETE ON public.reels_curtidas TO authenticated;
GRANT ALL ON public.reels_curtidas TO service_role;
ALTER TABLE public.reels_curtidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels_cur_read_all" ON public.reels_curtidas FOR SELECT USING (true);
CREATE POLICY "reels_cur_ins_own" ON public.reels_curtidas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reels_cur_del_own" ON public.reels_curtidas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.reels_analises (
  video_id TEXT NOT NULL PRIMARY KEY,
  titulo TEXT,
  canal TEXT,
  transcricao TEXT,
  analise_md TEXT NOT NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reels_analises TO anon, authenticated;
GRANT ALL ON public.reels_analises TO service_role;
ALTER TABLE public.reels_analises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels_ana_read_all" ON public.reels_analises FOR SELECT USING (true);
