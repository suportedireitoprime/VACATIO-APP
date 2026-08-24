
CREATE TABLE public.boletim_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boletim_id UUID NOT NULL REFERENCES public.boletins_juridicos(id) ON DELETE CASCADE,
  scene_index INT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (boletim_id, scene_index, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.boletim_likes TO authenticated;
GRANT SELECT ON public.boletim_likes TO anon;
GRANT ALL ON public.boletim_likes TO service_role;
ALTER TABLE public.boletim_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes visíveis a todos" ON public.boletim_likes FOR SELECT USING (true);
CREATE POLICY "Usuário curte" ON public.boletim_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário descurte" ON public.boletim_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.boletim_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boletim_id UUID NOT NULL REFERENCES public.boletins_juridicos(id) ON DELETE CASCADE,
  scene_index INT NOT NULL,
  user_id UUID NOT NULL,
  autor_nome TEXT,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.boletim_comentarios TO authenticated;
GRANT SELECT ON public.boletim_comentarios TO anon;
GRANT ALL ON public.boletim_comentarios TO service_role;
ALTER TABLE public.boletim_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comentários visíveis a todos" ON public.boletim_comentarios FOR SELECT USING (true);
CREATE POLICY "Usuário comenta" ON public.boletim_comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário apaga próprio comentário" ON public.boletim_comentarios FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_boletim_likes_scene ON public.boletim_likes(boletim_id, scene_index);
CREATE INDEX idx_boletim_comentarios_scene ON public.boletim_comentarios(boletim_id, scene_index);
