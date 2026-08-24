
-- 1) Admin identifier
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND email = 'wn7corporation@gmail.com'
  );
$$;

-- 2) feature_limits
CREATE TABLE public.feature_limits (
  feature_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  limit_value INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL CHECK (period IN ('daily','monthly','lifetime')),
  scope_key TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_limits TO authenticated;
GRANT ALL ON public.feature_limits TO service_role;

ALTER TABLE public.feature_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read feature_limits" ON public.feature_limits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin manages feature_limits" ON public.feature_limits
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER feature_limits_updated_at
BEFORE UPDATE ON public.feature_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) feature_usage
CREATE TABLE public.feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  scope_value TEXT,
  ref_key TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.feature_usage TO authenticated;
GRANT ALL ON public.feature_usage TO service_role;

CREATE INDEX feature_usage_user_feat_idx ON public.feature_usage(user_id, feature_key, used_at DESC);
CREATE INDEX feature_usage_scope_idx ON public.feature_usage(user_id, feature_key, scope_value);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own usage" ON public.feature_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "users insert own usage" ON public.feature_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4) Seed
INSERT INTO public.feature_limits (feature_key, label, description, category, limit_value, period, scope_key, sort_order) VALUES
  ('blog_read', 'Ler artigos do Blog', 'Quantos posts do blog jurídico o usuário free pode abrir', 'blog', 3, 'monthly', NULL, 10),
  ('lei_favorito', 'Favoritar artigo de lei', '0 = apenas assinantes', 'leis', 0, 'lifetime', NULL, 20),
  ('lei_anotacao', 'Anotações em artigos', '0 = apenas assinantes', 'leis', 0, 'lifetime', NULL, 21),
  ('narracao', 'Narração de artigo (TTS)', 'Áudio Gemini TTS', 'leis', 1, 'daily', NULL, 22),
  ('questoes', 'Praticar questões', 'Sessão de questões geradas por IA', 'estudo', 1, 'daily', NULL, 30),
  ('flashcards', 'Praticar flashcards', 'Sessão de flashcards', 'estudo', 1, 'daily', NULL, 31),
  ('grifo_manual', 'Grifo manual', 'Grifar trechos manualmente', 'grifos', 1, 'lifetime', NULL, 40),
  ('grifo_magico', 'Grifo mágico (IA)', 'Grifos sugeridos por IA', 'grifos', 1, 'lifetime', NULL, 41),
  ('grifo_foto', 'Grifo por foto', 'OCR + grifo automático', 'grifos', 1, 'lifetime', NULL, 42),
  ('grifo_voz', 'Grifo por voz', 'Grifos por comando de voz', 'grifos', 1, 'lifetime', NULL, 43),
  ('biblioteca_ler', 'Ler livro da biblioteca', '1 livro por coleção/mês (escopo = coleção)', 'biblioteca', 1, 'monthly', 'colecao', 50),
  ('ia_evelyn', 'Assistente IA Evelyn', 'Perguntas para a assistente jurídica', 'ia', 3, 'daily', NULL, 60),
  ('mapa_mental', 'Gerar mapa mental', 'Mapas gerados por IA', 'ia', 1, 'monthly', NULL, 61),
  ('resumo_ia', 'Resumo Cornell/Feynman', 'Resumos gerados por IA', 'ia', 1, 'monthly', NULL, 62),
  ('radar_analise', 'Análise IA de PL', 'Análise completa de projeto de lei', 'radar', 2, 'monthly', NULL, 70),
  ('simulado', 'Simulado completo', 'Simulados OAB', 'estudo', 1, 'monthly', NULL, 32),
  ('offline_download', 'Download offline de leis', '0 = apenas assinantes', 'leis', 0, 'lifetime', NULL, 23),
  ('gamificacao_fase', 'Fase de gamificação', 'Jogos educativos', 'estudo', 1, 'daily', NULL, 33),
  ('share_card', 'Compartilhar artigo como card', 'Exportar imagem/card do artigo', 'leis', 3, 'monthly', NULL, 24),
  ('noticia_read', 'Ler notícia jurídica completa', 'Notícias do Migalhas etc', 'blog', 5, 'monthly', NULL, 11),
  ('videoaula', 'Videoaula (fluxo YouTube)', 'Transcrição + resumo + questões', 'estudo', 2, 'monthly', NULL, 34);
