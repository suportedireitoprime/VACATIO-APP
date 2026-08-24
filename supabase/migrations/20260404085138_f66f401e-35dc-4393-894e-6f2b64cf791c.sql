
-- Macro para criar tabela de lei com schema padrão
-- Prioridade Máxima
CREATE TABLE IF NOT EXISTS public."LINDB_INTRODUCAO_NORMAS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  rotulo text,
  texto text NOT NULL DEFAULT '',
  caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0,
  ordem_numero integer DEFAULT 0,
  titulo text,
  capitulo text,
  incisos text[],
  paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LCH_CRIMES_HEDIONDOS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LTORT_TORTURA" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LCA_CRIMES_AMBIENTAIS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LRAC_RACISMO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LLAV_LAVAGEM_DINHEIRO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LPAF_PROCESSO_ADMINISTRATIVO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LRF_RESPONSABILIDADE_FISCAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LAI_ACESSO_INFORMACAO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LAP_ACAO_POPULAR" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LCP_CONTRAVENCOES_PENAIS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LDB_DIRETRIZES_EDUCACAO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

-- Prioridade Alta
CREATE TABLE IF NOT EXISTS public."LOMP_ORGANICA_MP" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LSA_SOCIEDADES_ACOES" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LPI_PROPRIEDADE_INDUSTRIAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LDA_DIREITOS_AUTORAIS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LACE_ANTICORRUPCAO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LCON_CONCESSOES" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LPPP_PARCERIAS_PUBLICO_PRIVADAS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LHD_HABEAS_DATA" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LMI_MANDADO_INJUNCAO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LPP_PARTIDOS_POLITICOS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LELE_ELEICOES" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LFL_FICHA_LIMPA" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LCSF_CRIMES_SISTEMA_FINANCEIRO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

-- Prioridade Média
CREATE TABLE IF NOT EXISTS public."LPT_PROTECAO_TESTEMUNHAS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LPSU_PARCELAMENTO_SOLO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LALP_ALIENACAO_PARENTAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LALIM_ALIMENTOS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LCADE_ANTITRUSTE" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LSUS_SISTEMA_UNICO_SAUDE" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LBIO_BIOSSEGURANCA" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LCI_CRIMES_INFORMATICOS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LINE_INELEGIBILIDADES" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LOTCU_ORGANICA_TCU" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LLE_LIBERDADE_ECONOMICA" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."CES_CODIGO_ETICA_SERVIDOR" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LMLS_MARCO_LEGAL_STARTUPS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LRT_REFORMA_TRIBUTARIA" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

CREATE TABLE IF NOT EXISTS public."LOAS_ASSISTENCIA_SOCIAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer DEFAULT 0, ordem_numero integer DEFAULT 0, titulo text, capitulo text, incisos text[], paragrafos text[]
);

-- Enable RLS on all new tables (public read, no write via API)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'LINDB_INTRODUCAO_NORMAS','LCH_CRIMES_HEDIONDOS','LTORT_TORTURA','LCA_CRIMES_AMBIENTAIS',
    'LRAC_RACISMO','LLAV_LAVAGEM_DINHEIRO','LPAF_PROCESSO_ADMINISTRATIVO','LRF_RESPONSABILIDADE_FISCAL',
    'LAI_ACESSO_INFORMACAO','LAP_ACAO_POPULAR','LCP_CONTRAVENCOES_PENAIS','LDB_DIRETRIZES_EDUCACAO',
    'LOMP_ORGANICA_MP','LSA_SOCIEDADES_ACOES','LPI_PROPRIEDADE_INDUSTRIAL','LDA_DIREITOS_AUTORAIS',
    'LACE_ANTICORRUPCAO','LCON_CONCESSOES','LPPP_PARCERIAS_PUBLICO_PRIVADAS','LHD_HABEAS_DATA',
    'LMI_MANDADO_INJUNCAO','LPP_PARTIDOS_POLITICOS','LELE_ELEICOES','LFL_FICHA_LIMPA',
    'LCSF_CRIMES_SISTEMA_FINANCEIRO','LPT_PROTECAO_TESTEMUNHAS','LPSU_PARCELAMENTO_SOLO',
    'LALP_ALIENACAO_PARENTAL','LALIM_ALIMENTOS','LCADE_ANTITRUSTE','LSUS_SISTEMA_UNICO_SAUDE',
    'LBIO_BIOSSEGURANCA','LCI_CRIMES_INFORMATICOS','LINE_INELEGIBILIDADES','LOTCU_ORGANICA_TCU',
    'LLE_LIBERDADE_ECONOMICA','CES_CODIGO_ETICA_SERVIDOR','LMLS_MARCO_LEGAL_STARTUPS',
    'LRT_REFORMA_TRIBUTARIA','LOAS_ASSISTENCIA_SOCIAL'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Public read access" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;
