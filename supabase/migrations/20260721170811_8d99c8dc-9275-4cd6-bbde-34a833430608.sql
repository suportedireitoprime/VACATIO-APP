
CREATE TABLE IF NOT EXISTS public.study_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela_nome TEXT NOT NULL,
  artigo_numero TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tabela_nome, artigo_numero)
);
GRANT SELECT ON public.study_questions TO anon, authenticated;
GRANT ALL ON public.study_questions TO service_role;
ALTER TABLE public.study_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read study_questions" ON public.study_questions FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.study_flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela_nome TEXT NOT NULL,
  artigo_numero TEXT NOT NULL,
  cards JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tabela_nome, artigo_numero)
);
GRANT SELECT ON public.study_flashcards TO anon, authenticated;
GRANT ALL ON public.study_flashcards TO service_role;
ALTER TABLE public.study_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read study_flashcards" ON public.study_flashcards FOR SELECT USING (true);
