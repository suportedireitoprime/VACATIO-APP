
-- ============================================================
-- Vade Mecum: fundação (Fase 1) — portada do DIREITO PRIME V2
-- ============================================================

-- Helper: trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1) vade_mecum_leis
-- ============================================================
CREATE TABLE public.vade_mecum_leis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  nome_curto text,
  categoria text NOT NULL DEFAULT 'lei' CHECK (categoria IN ('codigo','estatuto','lei','sumula')),
  ordem integer NOT NULL DEFAULT 0,
  planalto_url text,
  total_artigos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vade_mecum_leis TO anon;
GRANT SELECT ON public.vade_mecum_leis TO authenticated;
GRANT ALL ON public.vade_mecum_leis TO service_role;
ALTER TABLE public.vade_mecum_leis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leis são públicas para leitura"
  ON public.vade_mecum_leis FOR SELECT USING (true);
CREATE TRIGGER trg_vm_leis_updated
  BEFORE UPDATE ON public.vade_mecum_leis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) vade_mecum_artigos
-- ============================================================
CREATE TABLE public.vade_mecum_artigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lei_id uuid NOT NULL REFERENCES public.vade_mecum_leis(id) ON DELETE CASCADE,
  numero text,
  texto text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  relevancia text,
  relevancia_nota text,
  ult_alteracao_em date,
  revogado boolean DEFAULT false,
  alteracoes jsonb,
  comentario text,
  explicacao_tecnico text,
  explicacao_resumido text,
  explicacao_simples_maior16 text,
  explicacao_simples_menor16 text,
  exemplo text,
  termos jsonb,
  narracao_url text,
  planalto_url text,
  questoes jsonb,
  flashcards jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vade_mecum_artigos_lei_ordem
  ON public.vade_mecum_artigos (lei_id, ordem);
CREATE INDEX idx_vade_mecum_artigos_numero
  ON public.vade_mecum_artigos (lei_id, numero);
GRANT SELECT ON public.vade_mecum_artigos TO anon;
GRANT SELECT ON public.vade_mecum_artigos TO authenticated;
GRANT ALL ON public.vade_mecum_artigos TO service_role;
ALTER TABLE public.vade_mecum_artigos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artigos são públicos para leitura"
  ON public.vade_mecum_artigos FOR SELECT USING (true);
CREATE TRIGGER trg_vm_artigos_updated
  BEFORE UPDATE ON public.vade_mecum_artigos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) artigos_favoritos (user)
-- ============================================================
CREATE TABLE public.artigos_favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela_codigo text NOT NULL,
  numero_artigo text NOT NULL,
  artigo_id text NOT NULL,
  conteudo_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tabela_codigo, numero_artigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigos_favoritos TO authenticated;
GRANT ALL ON public.artigos_favoritos TO service_role;
ALTER TABLE public.artigos_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia seus favoritos"
  ON public.artigos_favoritos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_artigos_favoritos_user ON public.artigos_favoritos(user_id);
CREATE INDEX idx_artigos_favoritos_codigo ON public.artigos_favoritos(user_id, tabela_codigo);

-- ============================================================
-- 4) artigos_grifos (user)
-- ============================================================
CREATE TABLE public.artigos_grifos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela_codigo text NOT NULL,
  numero_artigo text NOT NULL,
  artigo_id text NOT NULL,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tabela_codigo, numero_artigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigos_grifos TO authenticated;
GRANT ALL ON public.artigos_grifos TO service_role;
ALTER TABLE public.artigos_grifos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia seus grifos"
  ON public.artigos_grifos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_artigos_grifos_user ON public.artigos_grifos(user_id);
CREATE INDEX idx_artigos_grifos_codigo ON public.artigos_grifos(user_id, tabela_codigo);
CREATE TRIGGER trg_artigos_grifos_updated
  BEFORE UPDATE ON public.artigos_grifos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5) artigos_anotacoes (user)
-- ============================================================
CREATE TABLE public.artigos_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela_codigo text NOT NULL,
  numero_artigo text NOT NULL,
  artigo_id text NOT NULL,
  anotacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tabela_codigo, numero_artigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artigos_anotacoes TO authenticated;
GRANT ALL ON public.artigos_anotacoes TO service_role;
ALTER TABLE public.artigos_anotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia suas anotações"
  ON public.artigos_anotacoes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_artigos_anotacoes_user ON public.artigos_anotacoes(user_id);
CREATE INDEX idx_artigos_anotacoes_artigo ON public.artigos_anotacoes(tabela_codigo, numero_artigo);
CREATE TRIGGER trg_artigos_anotacoes_updated
  BEFORE UPDATE ON public.artigos_anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6) artigos_visualizacoes (user)
-- ============================================================
CREATE TABLE public.artigos_visualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tabela_codigo text NOT NULL,
  numero_artigo text NOT NULL,
  origem text DEFAULT 'busca',
  visualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.artigos_visualizacoes TO authenticated;
GRANT ALL ON public.artigos_visualizacoes TO service_role;
ALTER TABLE public.artigos_visualizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê suas visualizações"
  ON public.artigos_visualizacoes FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Usuário registra suas visualizações"
  ON public.artigos_visualizacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_artigos_visualizacoes_tabela ON public.artigos_visualizacoes(tabela_codigo);
CREATE INDEX idx_artigos_visualizacoes_numero ON public.artigos_visualizacoes(numero_artigo);
CREATE INDEX idx_artigos_visualizacoes_tabela_numero ON public.artigos_visualizacoes(tabela_codigo, numero_artigo);
CREATE INDEX idx_artigos_visualizacoes_data ON public.artigos_visualizacoes(visualizado_em DESC);
CREATE INDEX idx_artigos_visualizacoes_user ON public.artigos_visualizacoes(user_id, visualizado_em DESC);

-- ============================================================
-- 7) artigo_ai_cache (leitura pública, escrita via service role/edge)
-- ============================================================
CREATE TABLE public.artigo_ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_codigo text NOT NULL,
  numero_artigo text NOT NULL,
  tipo text NOT NULL,
  conteudo jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tabela_codigo, numero_artigo, tipo)
);
GRANT SELECT ON public.artigo_ai_cache TO anon;
GRANT SELECT ON public.artigo_ai_cache TO authenticated;
GRANT ALL ON public.artigo_ai_cache TO service_role;
ALTER TABLE public.artigo_ai_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cache de IA é público para leitura"
  ON public.artigo_ai_cache FOR SELECT USING (true);
CREATE INDEX idx_artigo_ai_cache_lookup
  ON public.artigo_ai_cache(tabela_codigo, numero_artigo, tipo);
CREATE TRIGGER trg_artigo_ai_cache_updated
  BEFORE UPDATE ON public.artigo_ai_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8) HISTORICO_ALTERACOES (público)
-- ============================================================
CREATE TABLE public."HISTORICO_ALTERACOES" (
  id bigserial PRIMARY KEY,
  tabela_lei text NOT NULL,
  numero_artigo text NOT NULL,
  tipo_alteracao text NOT NULL,
  lei_alteradora text,
  data_alteracao date,
  ano_alteracao integer,
  texto_completo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT ON public."HISTORICO_ALTERACOES" TO anon;
GRANT SELECT ON public."HISTORICO_ALTERACOES" TO authenticated;
GRANT ALL ON public."HISTORICO_ALTERACOES" TO service_role;
ALTER TABLE public."HISTORICO_ALTERACOES" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Historico alteracoes publico"
  ON public."HISTORICO_ALTERACOES" FOR SELECT USING (true);
CREATE INDEX idx_historico_alteracoes_tabela ON public."HISTORICO_ALTERACOES"(tabela_lei);
CREATE INDEX idx_historico_alteracoes_artigo ON public."HISTORICO_ALTERACOES"(numero_artigo);
CREATE INDEX idx_historico_alteracoes_tabela_artigo ON public."HISTORICO_ALTERACOES"(tabela_lei, numero_artigo);
CREATE INDEX idx_historico_alteracoes_data ON public."HISTORICO_ALTERACOES"(data_alteracao DESC);
CREATE UNIQUE INDEX idx_historico_alteracoes_unique
  ON public."HISTORICO_ALTERACOES"(tabela_lei, numero_artigo, md5(texto_completo));
CREATE TRIGGER trg_historico_alteracoes_updated
  BEFORE UPDATE ON public."HISTORICO_ALTERACOES"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9) vade_mecum_ingest_jobs
-- ============================================================
CREATE TABLE public.vade_mecum_ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lei_slug text NOT NULL,
  lei_nome text,
  planalto_url text,
  categoria text,
  nome_curto text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','processando','ok','erro')),
  total_artigos integer,
  erro_msg text,
  log text,
  tentativas integer NOT NULL DEFAULT 0,
  usar_browserless boolean NOT NULL DEFAULT false,
  proxima_tentativa_em timestamptz,
  executado_em timestamptz NOT NULL DEFAULT now(),
  executado_por uuid
);
GRANT SELECT ON public.vade_mecum_ingest_jobs TO authenticated;
GRANT ALL ON public.vade_mecum_ingest_jobs TO service_role;
ALTER TABLE public.vade_mecum_ingest_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leem fila de ingestão"
  ON public.vade_mecum_ingest_jobs FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 10) RPCs (idênticas ao DIREITO PRIME V2)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_estatuto_head(_slug text, _limit int DEFAULT 40)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'lei', to_jsonb(l.*),
    'artigos', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'numero', a.numero,
          'texto', a.texto,
          'ordem', a.ordem,
          'relevancia', a.relevancia,
          'relevancia_nota', a.relevancia_nota,
          'ult_alteracao_em', a.ult_alteracao_em,
          'revogado', a.revogado
        )
        ORDER BY a.ordem
      )
      FROM (
        SELECT * FROM public.vade_mecum_artigos
        WHERE lei_id = l.id
        ORDER BY ordem
        LIMIT greatest(_limit, 1)
      ) a
    ), '[]'::jsonb)
  )
  FROM public.vade_mecum_leis l
  WHERE l.slug = _slug;
$$;

CREATE OR REPLACE FUNCTION public.get_estatuto_tail(_slug text, _offset int DEFAULT 40)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'artigos', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'numero', a.numero,
          'texto', a.texto,
          'ordem', a.ordem,
          'relevancia', a.relevancia,
          'relevancia_nota', a.relevancia_nota,
          'ult_alteracao_em', a.ult_alteracao_em,
          'revogado', a.revogado
        )
        ORDER BY a.ordem
      )
      FROM (
        SELECT * FROM public.vade_mecum_artigos
        WHERE lei_id = l.id
        ORDER BY ordem
        OFFSET greatest(_offset, 0)
      ) a
    ), '[]'::jsonb)
  )
  FROM public.vade_mecum_leis l
  WHERE l.slug = _slug;
$$;

CREATE OR REPLACE FUNCTION public.get_estatuto_user(_slug text, _user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'favoritos', coalesce((
      SELECT jsonb_agg(f.numero_artigo)
      FROM public.artigos_favoritos f
      WHERE f.tabela_codigo = l.slug AND f.user_id = _user_id
    ), '[]'::jsonb),
    'anotados', coalesce((
      SELECT jsonb_agg(DISTINCT n.numero_artigo)
      FROM public.artigos_anotacoes n
      WHERE n.tabela_codigo = l.slug AND n.user_id = _user_id
    ), '[]'::jsonb)
  )
  FROM public.vade_mecum_leis l
  WHERE l.slug = _slug;
$$;
