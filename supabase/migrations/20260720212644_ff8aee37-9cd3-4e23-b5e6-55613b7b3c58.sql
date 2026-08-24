
CREATE TABLE IF NOT EXISTS public.biblioteca_frases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_tabela text NOT NULL,
  livro_id text NOT NULL,
  frase text NOT NULL,
  motivo text,
  pagina_num integer,
  escopo text NOT NULL DEFAULT 'pagina',
  origem text NOT NULL DEFAULT 'ia',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS biblioteca_frases_livro_idx
  ON public.biblioteca_frases (livro_tabela, livro_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_frases_dedupe_idx
  ON public.biblioteca_frases (livro_tabela, livro_id, md5(frase));

GRANT SELECT, INSERT ON public.biblioteca_frases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_frases TO authenticated;
GRANT ALL ON public.biblioteca_frases TO service_role;

ALTER TABLE public.biblioteca_frases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Frases são públicas para leitura"
  ON public.biblioteca_frases FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um pode inserir frases"
  ON public.biblioteca_frases FOR INSERT
  WITH CHECK (true);
