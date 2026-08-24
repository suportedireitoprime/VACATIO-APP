-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_noticias_data ON noticias_camara(data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_radar_prop_tipo_ano ON radar_proposicoes(sigla_tipo, ano);

-- Remove duplicate constraint (keep the explicit unique index artigo_ai_cache_tabela_artigo_modo_uniq)
ALTER TABLE artigo_ai_cache DROP CONSTRAINT IF EXISTS artigo_ai_cache_tabela_nome_artigo_numero_modo_key;

-- 2. Fix view SECURITY DEFINER → INVOKER
ALTER VIEW IF EXISTS v_leis_catalogo SET (security_invoker = on);

-- 3. Restrict admin tables: write only via service_role

-- artigo_ai_cache
DROP POLICY IF EXISTS "artigo_ai_cache_insert" ON artigo_ai_cache;
DROP POLICY IF EXISTS "artigo_ai_cache_update" ON artigo_ai_cache;
DROP POLICY IF EXISTS "artigo_ai_cache_delete" ON artigo_ai_cache;
DROP POLICY IF EXISTS "Allow insert for all" ON artigo_ai_cache;
DROP POLICY IF EXISTS "Allow update for all" ON artigo_ai_cache;
CREATE POLICY "service_role_insert" ON artigo_ai_cache FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON artigo_ai_cache FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON artigo_ai_cache FOR DELETE TO service_role USING (true);

-- noticias_camara
DROP POLICY IF EXISTS "noticias_camara_insert" ON noticias_camara;
DROP POLICY IF EXISTS "noticias_camara_update" ON noticias_camara;
DROP POLICY IF EXISTS "noticias_camara_delete" ON noticias_camara;
DROP POLICY IF EXISTS "Allow insert" ON noticias_camara;
DROP POLICY IF EXISTS "Allow update" ON noticias_camara;
CREATE POLICY "service_role_insert" ON noticias_camara FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON noticias_camara FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON noticias_camara FOR DELETE TO service_role USING (true);

-- narracoes_artigos
DROP POLICY IF EXISTS "narracoes_insert" ON narracoes_artigos;
DROP POLICY IF EXISTS "narracoes_update" ON narracoes_artigos;
DROP POLICY IF EXISTS "narracoes_delete" ON narracoes_artigos;
DROP POLICY IF EXISTS "Allow insert for all" ON narracoes_artigos;
DROP POLICY IF EXISTS "Allow update for all" ON narracoes_artigos;
CREATE POLICY "service_role_insert" ON narracoes_artigos FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON narracoes_artigos FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON narracoes_artigos FOR DELETE TO service_role USING (true);

-- resenha_diaria
DROP POLICY IF EXISTS "resenha_insert" ON resenha_diaria;
DROP POLICY IF EXISTS "resenha_update" ON resenha_diaria;
DROP POLICY IF EXISTS "resenha_delete" ON resenha_diaria;
DROP POLICY IF EXISTS "Allow insert" ON resenha_diaria;
DROP POLICY IF EXISTS "Allow update" ON resenha_diaria;
CREATE POLICY "service_role_insert" ON resenha_diaria FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON resenha_diaria FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON resenha_diaria FOR DELETE TO service_role USING (true);

-- radar_proposicoes
DROP POLICY IF EXISTS "radar_proposicoes_insert" ON radar_proposicoes;
DROP POLICY IF EXISTS "radar_proposicoes_update" ON radar_proposicoes;
DROP POLICY IF EXISTS "radar_proposicoes_delete" ON radar_proposicoes;
DROP POLICY IF EXISTS "Allow insert" ON radar_proposicoes;
DROP POLICY IF EXISTS "Allow update" ON radar_proposicoes;
CREATE POLICY "service_role_insert" ON radar_proposicoes FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON radar_proposicoes FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON radar_proposicoes FOR DELETE TO service_role USING (true);

-- radar_deputados
DROP POLICY IF EXISTS "radar_deputados_insert" ON radar_deputados;
DROP POLICY IF EXISTS "radar_deputados_update" ON radar_deputados;
DROP POLICY IF EXISTS "radar_deputados_delete" ON radar_deputados;
DROP POLICY IF EXISTS "Allow insert" ON radar_deputados;
DROP POLICY IF EXISTS "Allow update" ON radar_deputados;
CREATE POLICY "service_role_insert" ON radar_deputados FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON radar_deputados FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON radar_deputados FOR DELETE TO service_role USING (true);

-- radar_ranking
DROP POLICY IF EXISTS "radar_ranking_insert" ON radar_ranking;
DROP POLICY IF EXISTS "radar_ranking_update" ON radar_ranking;
DROP POLICY IF EXISTS "radar_ranking_delete" ON radar_ranking;
DROP POLICY IF EXISTS "Allow insert" ON radar_ranking;
DROP POLICY IF EXISTS "Allow update" ON radar_ranking;
CREATE POLICY "service_role_insert" ON radar_ranking FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON radar_ranking FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON radar_ranking FOR DELETE TO service_role USING (true);

-- radar_votacoes
DROP POLICY IF EXISTS "radar_votacoes_insert" ON radar_votacoes;
DROP POLICY IF EXISTS "radar_votacoes_update" ON radar_votacoes;
DROP POLICY IF EXISTS "radar_votacoes_delete" ON radar_votacoes;
DROP POLICY IF EXISTS "Allow insert" ON radar_votacoes;
DROP POLICY IF EXISTS "Allow update" ON radar_votacoes;
CREATE POLICY "service_role_insert" ON radar_votacoes FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON radar_votacoes FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON radar_votacoes FOR DELETE TO service_role USING (true);

-- sumulas
DROP POLICY IF EXISTS "sumulas_insert" ON sumulas;
DROP POLICY IF EXISTS "sumulas_update" ON sumulas;
DROP POLICY IF EXISTS "sumulas_delete" ON sumulas;
DROP POLICY IF EXISTS "Allow insert" ON sumulas;
DROP POLICY IF EXISTS "Allow update" ON sumulas;
CREATE POLICY "service_role_insert" ON sumulas FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_role_update" ON sumulas FOR UPDATE TO service_role USING (true);
CREATE POLICY "service_role_delete" ON sumulas FOR DELETE TO service_role USING (true);