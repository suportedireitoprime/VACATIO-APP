
-- Tabela biblioteca_livros
CREATE TABLE public.biblioteca_livros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL DEFAULT 'Sem título',
  autor text,
  total_paginas integer NOT NULL DEFAULT 0,
  conteudo jsonb NOT NULL DEFAULT '[]'::jsonb,
  capa_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ultima_pagina integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  tamanho_bytes bigint DEFAULT 0
);

ALTER TABLE public.biblioteca_livros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own books" ON public.biblioteca_livros
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users insert own books" ON public.biblioteca_livros
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own books" ON public.biblioteca_livros
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own books" ON public.biblioteca_livros
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Tabela biblioteca_imagens
CREATE TABLE public.biblioteca_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id uuid REFERENCES public.biblioteca_livros(id) ON DELETE CASCADE NOT NULL,
  pagina integer NOT NULL DEFAULT 0,
  url text NOT NULL,
  alt_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.biblioteca_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own book images" ON public.biblioteca_imagens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.biblioteca_livros WHERE id = livro_id AND user_id = auth.uid()));

CREATE POLICY "Service insert images" ON public.biblioteca_imagens
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service delete images" ON public.biblioteca_imagens
  FOR DELETE TO service_role USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('biblioteca', 'biblioteca', true);

CREATE POLICY "Auth users upload to biblioteca" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biblioteca' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Auth users read own biblioteca files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'biblioteca' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read biblioteca" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'biblioteca');

CREATE POLICY "Auth users delete own biblioteca files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'biblioteca' AND (storage.foldername(name))[1] = auth.uid()::text);
