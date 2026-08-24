-- ============================================================
-- 1) DICIONÁRIO JURÍDICO
-- ============================================================
CREATE TABLE public.dicionario_juridico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letra text NOT NULL,
  palavra text NOT NULL,
  significado text NOT NULL,
  exemplo_pratico text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dicionario_letra ON public.dicionario_juridico(letra);
CREATE INDEX idx_dicionario_palavra ON public.dicionario_juridico(palavra);
GRANT SELECT ON public.dicionario_juridico TO anon, authenticated;
GRANT ALL ON public.dicionario_juridico TO service_role;
ALTER TABLE public.dicionario_juridico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dicionário: leitura pública" ON public.dicionario_juridico FOR SELECT USING (true);
CREATE POLICY "Dicionário: admin gerencia" ON public.dicionario_juridico FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_dicionario_updated_at BEFORE UPDATE ON public.dicionario_juridico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) INFORMATIVOS STF
-- ============================================================
CREATE TABLE public.informativos_stf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao integer NOT NULL,
  edicao_titulo text,
  ordem integer NOT NULL,
  data_publicacao date,
  destaque text,
  tema text,
  ramo_direito text,
  secao text,
  processo text,
  inteiro_teor text,
  informacoes_adicionais text,
  raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inf_stf_edicao ON public.informativos_stf(edicao, ordem);
GRANT SELECT ON public.informativos_stf TO anon, authenticated;
GRANT ALL ON public.informativos_stf TO service_role;
ALTER TABLE public.informativos_stf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Informativos STF: leitura pública" ON public.informativos_stf FOR SELECT USING (true);
CREATE POLICY "Informativos STF: admin gerencia" ON public.informativos_stf FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_inf_stf_updated_at BEFORE UPDATE ON public.informativos_stf FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) INFORMATIVOS STJ
-- ============================================================
CREATE TABLE public.informativos_stj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao integer NOT NULL,
  edicao_titulo text,
  ordem integer NOT NULL,
  data_publicacao date,
  destaque text,
  tema text,
  ramo_direito text,
  secao text,
  processo text,
  inteiro_teor text,
  informacoes_adicionais text,
  raw text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inf_stj_edicao ON public.informativos_stj(edicao, ordem);
GRANT SELECT ON public.informativos_stj TO anon, authenticated;
GRANT ALL ON public.informativos_stj TO service_role;
ALTER TABLE public.informativos_stj ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Informativos STJ: leitura pública" ON public.informativos_stj FOR SELECT USING (true);
CREATE POLICY "Informativos STJ: admin gerencia" ON public.informativos_stj FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_inf_stj_updated_at BEFORE UPDATE ON public.informativos_stj FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4) JURISPRUDÊNCIAS PRONTAS
-- ============================================================
CREATE TABLE public.jurisprudencia_prontas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  ramo text NOT NULL,
  tribunal text NOT NULL,
  assunto text,
  query_url text NOT NULL,
  query_string text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jp_ramo ON public.jurisprudencia_prontas(ramo);
CREATE INDEX idx_jp_tribunal ON public.jurisprudencia_prontas(tribunal);
GRANT SELECT ON public.jurisprudencia_prontas TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_prontas TO service_role;
ALTER TABLE public.jurisprudencia_prontas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Juris prontas: leitura pública" ON public.jurisprudencia_prontas FOR SELECT USING (true);
CREATE POLICY "Juris prontas: admin gerencia" ON public.jurisprudencia_prontas FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_jp_updated_at BEFORE UPDATE ON public.jurisprudencia_prontas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5) RESULTADOS DE JURISPRUDÊNCIAS PRONTAS
-- ============================================================
CREATE TABLE public.jurisprudencia_prontas_resultados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid NOT NULL REFERENCES public.jurisprudencia_prontas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  ementa text,
  ementa_refinada text,
  observacao text,
  observacao_refinada text,
  relator text,
  orgao text,
  data_julgamento date,
  data_publicacao date,
  url_inteiro_teor text,
  url_pdf text,
  raw jsonb,
  ordem integer NOT NULL DEFAULT 0,
  refinado_em timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jpr_pesquisa ON public.jurisprudencia_prontas_resultados(pesquisa_id, ordem);
GRANT SELECT ON public.jurisprudencia_prontas_resultados TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_prontas_resultados TO service_role;
ALTER TABLE public.jurisprudencia_prontas_resultados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Juris resultados: leitura pública" ON public.jurisprudencia_prontas_resultados FOR SELECT USING (true);
CREATE POLICY "Juris resultados: admin gerencia" ON public.jurisprudencia_prontas_resultados FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

-- ============================================================
-- 6) TESES - EDIÇÕES
-- ============================================================
CREATE TABLE public.jurisprudencia_teses_edicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao integer NOT NULL,
  titulo text NOT NULL,
  tribunal text NOT NULL DEFAULT 'STJ',
  ramo text,
  data_publicacao date,
  total_teses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_teses_ed_tribunal ON public.jurisprudencia_teses_edicoes(tribunal, edicao);
GRANT SELECT ON public.jurisprudencia_teses_edicoes TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_teses_edicoes TO service_role;
ALTER TABLE public.jurisprudencia_teses_edicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teses edições: leitura pública" ON public.jurisprudencia_teses_edicoes FOR SELECT USING (true);
CREATE POLICY "Teses edições: admin gerencia" ON public.jurisprudencia_teses_edicoes FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_teses_ed_updated_at BEFORE UPDATE ON public.jurisprudencia_teses_edicoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7) TESES - ITENS
-- ============================================================
CREATE TABLE public.jurisprudencia_teses_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao_id uuid NOT NULL REFERENCES public.jurisprudencia_teses_edicoes(id) ON DELETE CASCADE,
  edicao integer NOT NULL,
  tribunal text NOT NULL DEFAULT 'STJ',
  numero integer NOT NULL,
  tese text NOT NULL,
  julgados text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_teses_it_edicao ON public.jurisprudencia_teses_itens(edicao_id, numero);
GRANT SELECT ON public.jurisprudencia_teses_itens TO anon, authenticated;
GRANT ALL ON public.jurisprudencia_teses_itens TO service_role;
ALTER TABLE public.jurisprudencia_teses_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teses itens: leitura pública" ON public.jurisprudencia_teses_itens FOR SELECT USING (true);
CREATE POLICY "Teses itens: admin gerencia" ON public.jurisprudencia_teses_itens FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_teses_it_updated_at BEFORE UPDATE ON public.jurisprudencia_teses_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8) SÚMULAS STF
-- ============================================================
CREATE TABLE public.sumulas_stf (
  numero integer PRIMARY KEY,
  enunciado text NOT NULL,
  situacao text NOT NULL DEFAULT 'vigente',
  data_aprovacao date,
  fonte_publicacao text,
  orgao_julgador text,
  ramo_direito text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sumulas_stf TO anon, authenticated;
GRANT ALL ON public.sumulas_stf TO service_role;
ALTER TABLE public.sumulas_stf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Súmulas STF: leitura pública" ON public.sumulas_stf FOR SELECT USING (true);
CREATE POLICY "Súmulas STF: admin gerencia" ON public.sumulas_stf FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_sum_stf_updated_at BEFORE UPDATE ON public.sumulas_stf FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9) SÚMULAS STJ
-- ============================================================
CREATE TABLE public.sumulas_stj (
  numero integer PRIMARY KEY,
  enunciado text NOT NULL,
  situacao text NOT NULL DEFAULT 'vigente',
  data_publicacao date,
  orgao_julgador text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sumulas_stj TO anon, authenticated;
GRANT ALL ON public.sumulas_stj TO service_role;
ALTER TABLE public.sumulas_stj ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Súmulas STJ: leitura pública" ON public.sumulas_stj FOR SELECT USING (true);
CREATE POLICY "Súmulas STJ: admin gerencia" ON public.sumulas_stj FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_sum_stj_updated_at BEFORE UPDATE ON public.sumulas_stj FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 10) SÚMULAS VINCULANTES
-- ============================================================
CREATE TABLE public.sumulas_vinculantes (
  numero integer PRIMARY KEY,
  enunciado text NOT NULL DEFAULT '',
  situacao text NOT NULL DEFAULT 'vigente',
  data_publicacao date,
  referencia text,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sumulas_vinculantes TO anon, authenticated;
GRANT ALL ON public.sumulas_vinculantes TO service_role;
ALTER TABLE public.sumulas_vinculantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Súmulas Vinculantes: leitura pública" ON public.sumulas_vinculantes FOR SELECT USING (true);
CREATE POLICY "Súmulas Vinculantes: admin gerencia" ON public.sumulas_vinculantes FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_sum_vinc_updated_at BEFORE UPDATE ON public.sumulas_vinculantes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 11) SÚMULAS - FAVORITOS DO USUÁRIO
-- ============================================================
CREATE TABLE public.sumulas_favoritos (
  user_id uuid NOT NULL,
  tribunal text NOT NULL,
  sumula_numero integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tribunal, sumula_numero)
);
CREATE INDEX idx_sum_fav_user ON public.sumulas_favoritos(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sumulas_favoritos TO authenticated;
GRANT ALL ON public.sumulas_favoritos TO service_role;
ALTER TABLE public.sumulas_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Súmulas favoritos: dono gerencia" ON public.sumulas_favoritos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);