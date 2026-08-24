
-- 1) Mapa de leis (nosso slug → id do Corpus927)
CREATE TABLE public.jurisprudencia_leis_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug_local TEXT NOT NULL UNIQUE,
  corpus_lei_id INTEGER NOT NULL,
  corpus_lei_slug TEXT,
  nome_exibicao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jurisprudencia_leis_map TO anon;
GRANT SELECT ON public.jurisprudencia_leis_map TO authenticated;
GRANT ALL ON public.jurisprudencia_leis_map TO service_role;
ALTER TABLE public.jurisprudencia_leis_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read jurisprudencia_leis_map" ON public.jurisprudencia_leis_map FOR SELECT USING (true);
CREATE POLICY "Admins manage jurisprudencia_leis_map" ON public.jurisprudencia_leis_map FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_jurisprudencia_leis_map_updated_at BEFORE UPDATE ON public.jurisprudencia_leis_map FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Cache por artigo
CREATE TABLE public.jurisprudencia_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corpus_lei_id INTEGER NOT NULL,
  numero_artigo TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_itens INTEGER NOT NULL DEFAULT 0,
  fonte TEXT NOT NULL DEFAULT 'corpus927',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(corpus_lei_id, numero_artigo)
);
CREATE INDEX jurisprudencia_cache_lookup_idx ON public.jurisprudencia_cache(corpus_lei_id, numero_artigo);
CREATE INDEX jurisprudencia_cache_expires_idx ON public.jurisprudencia_cache(expires_at);
GRANT SELECT ON public.jurisprudencia_cache TO anon;
GRANT SELECT ON public.jurisprudencia_cache TO authenticated;
GRANT ALL ON public.jurisprudencia_cache TO service_role;
ALTER TABLE public.jurisprudencia_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read jurisprudencia_cache" ON public.jurisprudencia_cache FOR SELECT USING (true);
CREATE TRIGGER trg_jurisprudencia_cache_updated_at BEFORE UPDATE ON public.jurisprudencia_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Favoritos por usuário
CREATE TABLE public.jurisprudencia_favoritos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  corpus_item_id BIGINT NOT NULL,
  categoria TEXT NOT NULL,
  titulo TEXT,
  conteudo TEXT,
  url_origem TEXT,
  slug_local TEXT,
  numero_artigo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, corpus_item_id)
);
CREATE INDEX jurisprudencia_favoritos_user_idx ON public.jurisprudencia_favoritos(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisprudencia_favoritos TO authenticated;
GRANT ALL ON public.jurisprudencia_favoritos TO service_role;
ALTER TABLE public.jurisprudencia_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own jurisprudencia favoritos" ON public.jurisprudencia_favoritos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Seed inicial das principais leis (IDs do Corpus927 confirmados)
-- CP=20 já confirmado ao vivo; demais serão validados pelo admin (podem ser corrigidos depois).
INSERT INTO public.jurisprudencia_leis_map (slug_local, corpus_lei_id, corpus_lei_slug, nome_exibicao) VALUES
  ('codigo-penal', 20, 'cp', 'Código Penal')
ON CONFLICT (slug_local) DO NOTHING;
