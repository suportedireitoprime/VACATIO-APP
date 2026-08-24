
CREATE TABLE IF NOT EXISTS public.videoaula_conteudo (
  video_id text PRIMARY KEY,
  titulo text,
  canal text,
  artigo_numero text,
  tabela_nome text,
  transcricao text,
  resumo_md text,
  questoes jsonb,
  flashcards jsonb,
  likes_count int NOT NULL DEFAULT 0,
  dislikes_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videoaula_conteudo TO anon, authenticated;
GRANT ALL ON public.videoaula_conteudo TO service_role;
ALTER TABLE public.videoaula_conteudo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read videoaula_conteudo" ON public.videoaula_conteudo FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.videoaula_reacoes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('like','dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videoaula_reacoes TO authenticated;
GRANT ALL ON public.videoaula_reacoes TO service_role;
ALTER TABLE public.videoaula_reacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all reacoes" ON public.videoaula_reacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own reacoes" ON public.videoaula_reacoes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.videoaula_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_nome text,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_videoaula_comentarios_video ON public.videoaula_comentarios (video_id, created_at DESC);
GRANT SELECT ON public.videoaula_comentarios TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.videoaula_comentarios TO authenticated;
GRANT ALL ON public.videoaula_comentarios TO service_role;
ALTER TABLE public.videoaula_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read comentarios" ON public.videoaula_comentarios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth insert comentarios" ON public.videoaula_comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete comentarios" ON public.videoaula_comentarios FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own update comentarios" ON public.videoaula_comentarios FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_videoaula_reacao(_video_id text, _tipo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
  novo_tipo text;
  likes int;
  dislikes int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT tipo INTO existing FROM public.videoaula_reacoes WHERE user_id = uid AND video_id = _video_id;
  IF existing = _tipo THEN
    DELETE FROM public.videoaula_reacoes WHERE user_id = uid AND video_id = _video_id;
    novo_tipo := NULL;
  ELSE
    INSERT INTO public.videoaula_reacoes (user_id, video_id, tipo) VALUES (uid, _video_id, _tipo)
      ON CONFLICT (user_id, video_id) DO UPDATE SET tipo = EXCLUDED.tipo, created_at = now();
    novo_tipo := _tipo;
  END IF;
  SELECT COUNT(*) FILTER (WHERE tipo = 'like'), COUNT(*) FILTER (WHERE tipo = 'dislike')
    INTO likes, dislikes FROM public.videoaula_reacoes WHERE video_id = _video_id;
  INSERT INTO public.videoaula_conteudo (video_id, likes_count, dislikes_count)
    VALUES (_video_id, likes, dislikes)
    ON CONFLICT (video_id) DO UPDATE SET likes_count = EXCLUDED.likes_count, dislikes_count = EXCLUDED.dislikes_count, updated_at = now();
  RETURN jsonb_build_object('tipo', novo_tipo, 'likes', likes, 'dislikes', dislikes);
END;
$$;
