
CREATE TABLE public.anotacoes_artigo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  texto text NOT NULL DEFAULT '',
  sugerida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anotacoes_artigo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read anotacoes" ON public.anotacoes_artigo FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert anotacoes" ON public.anotacoes_artigo FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can delete anotacoes" ON public.anotacoes_artigo FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update anotacoes" ON public.anotacoes_artigo FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
