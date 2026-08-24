
CREATE TABLE IF NOT EXISTS public.biblioteca_leitura_nativa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id text NOT NULL,
  livro_tabela text NOT NULL,
  conteudo_md text,
  sumario_json jsonb DEFAULT '[]'::jsonb,
  total_paginas integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  erro_detalhe text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (livro_tabela, livro_id)
);

GRANT SELECT ON public.biblioteca_leitura_nativa TO anon;
GRANT SELECT, INSERT, UPDATE ON public.biblioteca_leitura_nativa TO authenticated;
GRANT ALL ON public.biblioteca_leitura_nativa TO service_role;

ALTER TABLE public.biblioteca_leitura_nativa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública leitura_nativa" ON public.biblioteca_leitura_nativa
  FOR SELECT USING (true);

CREATE TRIGGER update_biblioteca_leitura_nativa_updated_at
  BEFORE UPDATE ON public.biblioteca_leitura_nativa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_biblioteca_leitura_nativa_lookup
  ON public.biblioteca_leitura_nativa (livro_tabela, livro_id);

CREATE TABLE IF NOT EXISTS public.biblioteca_leitura_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  livro_id text NOT NULL,
  livro_tabela text NOT NULL,
  pagina_atual integer DEFAULT 0,
  scroll_offset integer DEFAULT 0,
  bookmark_ids jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, livro_tabela, livro_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_leitura_progresso TO authenticated;
GRANT ALL ON public.biblioteca_leitura_progresso TO service_role;

ALTER TABLE public.biblioteca_leitura_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprio progresso"
  ON public.biblioteca_leitura_progresso
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_biblioteca_leitura_progresso_updated_at
  BEFORE UPDATE ON public.biblioteca_leitura_progresso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage: só o service_role escreve; leitura via URLs assinadas geradas no server.
CREATE POLICY "Service role escreve biblioteca-ocr"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'biblioteca-ocr')
  WITH CHECK (bucket_id = 'biblioteca-ocr');
