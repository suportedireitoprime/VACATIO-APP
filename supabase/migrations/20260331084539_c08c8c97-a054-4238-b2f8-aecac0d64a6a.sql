
-- =============================================
-- 1. FTS RPC: buscar_artigos_global
-- Searches across ALL law tables using Portuguese FTS
-- Returns unified results ranked by relevance
-- =============================================

CREATE TYPE public.artigo_busca_result AS (
  numero text,
  caput text,
  tabela_nome text,
  rank real
);

CREATE OR REPLACE FUNCTION public.buscar_artigos_global(
  search_query text,
  tabelas text[] DEFAULT NULL,
  max_results integer DEFAULT 30
)
RETURNS SETOF public.artigo_busca_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_tables text[] := ARRAY[
    'CF88_CONSTITUICAO_FEDERAL','CP_CODIGO_PENAL','CC_CODIGO_CIVIL',
    'CPC_CODIGO_PROCESSO_CIVIL','CPP_CODIGO_PROCESSO_PENAL',
    'CTN_CODIGO_TRIBUTARIO_NACIONAL','CDC_CODIGO_DEFESA_CONSUMIDOR',
    'CLT_CONSOLIDACAO_LEIS_TRABALHO','ECA_ESTATUTO_CRIANCA_ADOLESCENTE',
    'CTB_CODIGO_TRANSITO_BRASILEIRO','EI_ESTATUTO_IDOSO',
    'EPD_ESTATUTO_PESSOA_DEFICIENCIA','EOAB_ESTATUTO_OAB',
    'CE_CODIGO_ELEITORAL','CFLOR_CODIGO_FLORESTAL',
    'CPM_CODIGO_PENAL_MILITAR','CPPM_CODIGO_PROCESSO_PENAL_MILITAR',
    'CBA_CODIGO_BRASILEIRO_AERONAUTICA','CCOM_CODIGO_COMERCIAL',
    'CMIN_CODIGO_MINAS','CTEL_CODIGO_TELECOMUNICACOES',
    'CAGUA_CODIGO_AGUAS','EC_ESTATUTO_CIDADE',
    'ED_ESTATUTO_DESARMAMENTO','EIND_ESTATUTO_INDIO',
    'EIR_ESTATUTO_IGUALDADE_RACIAL','EJ_ESTATUTO_JUVENTUDE',
    'EM_ESTATUTO_MILITARES','EME_ESTATUTO_MICROEMPRESA',
    'EMET_ESTATUTO_METROPOLE','EMIG_ESTATUTO_MIGRACAO',
    'EMUS_ESTATUTO_MUSEUS','EPC_ESTATUTO_PESSOA_CANCER',
    'EREF_ESTATUTO_REFUGIADO','ET_ESTATUTO_TORCEDOR',
    'ETERRA_ESTATUTO_TERRA'
  ];
  target_tables text[];
  t text;
  is_numeric boolean;
BEGIN
  target_tables := COALESCE(tabelas, all_tables);
  is_numeric := search_query ~ '^\d+$';
  
  FOR t IN SELECT unnest(target_tables) LOOP
    IF is_numeric THEN
      RETURN QUERY EXECUTE format(
        'SELECT numero, caput, %L::text AS tabela_nome, 1.0::real AS rank
         FROM %I WHERE numero = $1 LIMIT 5',
        t, t
      ) USING search_query;
    ELSE
      RETURN QUERY EXECUTE format(
        'SELECT numero, caput, %L::text AS tabela_nome,
                ts_rank(to_tsvector(''portuguese'', caput), plainto_tsquery(''portuguese'', $1))::real AS rank
         FROM %I
         WHERE to_tsvector(''portuguese'', caput) @@ plainto_tsquery(''portuguese'', $1)
         ORDER BY rank DESC LIMIT 5',
        t, t
      ) USING search_query;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- =============================================
-- 2. RPC: estatisticas_estudo
-- Aggregates study stats server-side instead of loading 500 rows to client
-- =============================================

CREATE TYPE public.estudo_lei_stat AS (
  tabela_nome text,
  total_questoes bigint,
  total_corretas bigint,
  total_sessoes bigint,
  pct_acerto integer
);

CREATE OR REPLACE FUNCTION public.estatisticas_estudo(p_user_id uuid)
RETURNS SETOF public.estudo_lei_stat
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tabela_nome,
    SUM(total)::bigint AS total_questoes,
    SUM(correct)::bigint AS total_corretas,
    COUNT(*)::bigint AS total_sessoes,
    CASE WHEN SUM(total) > 0
      THEN ROUND((SUM(correct)::numeric / SUM(total)::numeric) * 100)::integer
      ELSE 0
    END AS pct_acerto
  FROM study_sessions
  WHERE user_id = p_user_id
  GROUP BY tabela_nome
  ORDER BY total_sessoes DESC;
$$;

-- =============================================
-- 3. View: v_leis_catalogo
-- Unified catalog of all law tables with article counts
-- =============================================

CREATE OR REPLACE VIEW public.v_leis_catalogo AS
SELECT 'CF88_CONSTITUICAO_FEDERAL' AS tabela_nome, 'Constituição Federal' AS nome, 'CF/88' AS sigla, 'constituicao' AS tipo, COUNT(*) AS total_artigos FROM "CF88_CONSTITUICAO_FEDERAL"
UNION ALL SELECT 'CP_CODIGO_PENAL', 'Código Penal', 'CP', 'codigo', COUNT(*) FROM "CP_CODIGO_PENAL"
UNION ALL SELECT 'CC_CODIGO_CIVIL', 'Código Civil', 'CC', 'codigo', COUNT(*) FROM "CC_CODIGO_CIVIL"
UNION ALL SELECT 'CPC_CODIGO_PROCESSO_CIVIL', 'Código de Processo Civil', 'CPC', 'codigo', COUNT(*) FROM "CPC_CODIGO_PROCESSO_CIVIL"
UNION ALL SELECT 'CPP_CODIGO_PROCESSO_PENAL', 'Código de Processo Penal', 'CPP', 'codigo', COUNT(*) FROM "CPP_CODIGO_PROCESSO_PENAL"
UNION ALL SELECT 'CTN_CODIGO_TRIBUTARIO_NACIONAL', 'Código Tributário Nacional', 'CTN', 'codigo', COUNT(*) FROM "CTN_CODIGO_TRIBUTARIO_NACIONAL"
UNION ALL SELECT 'CDC_CODIGO_DEFESA_CONSUMIDOR', 'Código de Defesa do Consumidor', 'CDC', 'codigo', COUNT(*) FROM "CDC_CODIGO_DEFESA_CONSUMIDOR"
UNION ALL SELECT 'CLT_CONSOLIDACAO_LEIS_TRABALHO', 'Consolidação das Leis do Trabalho', 'CLT', 'codigo', COUNT(*) FROM "CLT_CONSOLIDACAO_LEIS_TRABALHO"
UNION ALL SELECT 'ECA_ESTATUTO_CRIANCA_ADOLESCENTE', 'Estatuto da Criança e do Adolescente', 'ECA', 'estatuto', COUNT(*) FROM "ECA_ESTATUTO_CRIANCA_ADOLESCENTE"
UNION ALL SELECT 'CTB_CODIGO_TRANSITO_BRASILEIRO', 'Código de Trânsito Brasileiro', 'CTB', 'codigo', COUNT(*) FROM "CTB_CODIGO_TRANSITO_BRASILEIRO"
UNION ALL SELECT 'EI_ESTATUTO_IDOSO', 'Estatuto do Idoso', 'EI', 'estatuto', COUNT(*) FROM "EI_ESTATUTO_IDOSO"
UNION ALL SELECT 'EPD_ESTATUTO_PESSOA_DEFICIENCIA', 'Estatuto da Pessoa com Deficiência', 'EPD', 'estatuto', COUNT(*) FROM "EPD_ESTATUTO_PESSOA_DEFICIENCIA"
UNION ALL SELECT 'EOAB_ESTATUTO_OAB', 'Estatuto da OAB', 'EOAB', 'estatuto', COUNT(*) FROM "EOAB_ESTATUTO_OAB"
UNION ALL SELECT 'CE_CODIGO_ELEITORAL', 'Código Eleitoral', 'CE', 'codigo', COUNT(*) FROM "CE_CODIGO_ELEITORAL"
UNION ALL SELECT 'CFLOR_CODIGO_FLORESTAL', 'Código Florestal', 'CFLOR', 'codigo', COUNT(*) FROM "CFLOR_CODIGO_FLORESTAL"
UNION ALL SELECT 'CPM_CODIGO_PENAL_MILITAR', 'Código Penal Militar', 'CPM', 'codigo', COUNT(*) FROM "CPM_CODIGO_PENAL_MILITAR"
UNION ALL SELECT 'CPPM_CODIGO_PROCESSO_PENAL_MILITAR', 'Código de Processo Penal Militar', 'CPPM', 'codigo', COUNT(*) FROM "CPPM_CODIGO_PROCESSO_PENAL_MILITAR";

-- Grant access
GRANT SELECT ON public.v_leis_catalogo TO anon, authenticated;

-- =============================================
-- 4. FTS indexes on all major law tables (Portuguese config)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_cf88_fts ON "CF88_CONSTITUICAO_FEDERAL" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_cp_fts ON "CP_CODIGO_PENAL" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_cc_fts ON "CC_CODIGO_CIVIL" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_cpc_fts ON "CPC_CODIGO_PROCESSO_CIVIL" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_cpp_fts ON "CPP_CODIGO_PROCESSO_PENAL" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_ctn_fts ON "CTN_CODIGO_TRIBUTARIO_NACIONAL" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_cdc_fts ON "CDC_CODIGO_DEFESA_CONSUMIDOR" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_clt_fts ON "CLT_CONSOLIDACAO_LEIS_TRABALHO" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_eca_fts ON "ECA_ESTATUTO_CRIANCA_ADOLESCENTE" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_ctb_fts ON "CTB_CODIGO_TRANSITO_BRASILEIRO" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_ei_fts ON "EI_ESTATUTO_IDOSO" USING gin(to_tsvector('portuguese', caput));
CREATE INDEX IF NOT EXISTS idx_epd_fts ON "EPD_ESTATUTO_PESSOA_DEFICIENCIA" USING gin(to_tsvector('portuguese', caput));
