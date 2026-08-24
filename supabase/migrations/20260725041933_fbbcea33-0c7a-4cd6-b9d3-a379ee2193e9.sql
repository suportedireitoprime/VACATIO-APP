
-- ============ artigos_anotacoes ============
CREATE TABLE public.artigos_anotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela_codigo TEXT NOT NULL,
  numero_artigo TEXT NOT NULL,
  artigo_id TEXT,
  anotacao TEXT,
  audio_url TEXT,
  audio_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX artigos_anotacoes_user_artigo_idx
  ON public.artigos_anotacoes (user_id, tabela_codigo, numero_artigo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigos_anotacoes TO authenticated;
GRANT ALL ON public.artigos_anotacoes TO service_role;

ALTER TABLE public.artigos_anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own annotations"
  ON public.artigos_anotacoes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own annotations"
  ON public.artigos_anotacoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own annotations"
  ON public.artigos_anotacoes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own annotations"
  ON public.artigos_anotacoes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ artigos_grifos ============
CREATE TABLE public.artigos_grifos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela_codigo TEXT NOT NULL,
  numero_artigo TEXT NOT NULL,
  artigo_id TEXT,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tabela_codigo, numero_artigo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigos_grifos TO authenticated;
GRANT ALL ON public.artigos_grifos TO service_role;

ALTER TABLE public.artigos_grifos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own highlights"
  ON public.artigos_grifos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own highlights"
  ON public.artigos_grifos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own highlights"
  ON public.artigos_grifos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own highlights"
  ON public.artigos_grifos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER artigos_anotacoes_updated_at
  BEFORE UPDATE ON public.artigos_anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER artigos_grifos_updated_at
  BEFORE UPDATE ON public.artigos_grifos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
