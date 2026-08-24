
CREATE TABLE public.biblioteca_favoritos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  livro_key TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, livro_key)
);

ALTER TABLE public.biblioteca_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.biblioteca_favoritos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.biblioteca_favoritos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.biblioteca_favoritos FOR DELETE
  USING (auth.uid() = user_id);
