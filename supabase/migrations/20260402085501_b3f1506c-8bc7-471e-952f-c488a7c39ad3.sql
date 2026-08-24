
DO $$ 
DECLARE
  tables text[] := ARRAY[
    'LIT_INTERCEPTACAO_TELEFONICA',
    'L8112_SERVIDORES_FEDERAIS',
    'LIA_IMPROBIDADE_ADMINISTRATIVA',
    'NLL_LICITACOES',
    'LMS_MANDADO_SEGURANCA',
    'LACP_ACAO_CIVIL_PUBLICA',
    'LJE_JUIZADOS_ESPECIAIS',
    'LGPD_PROTECAO_DADOS',
    'MCI_MARCO_CIVIL_INTERNET',
    'LF_FALENCIAS',
    'LA_ARBITRAGEM',
    'LI_INQUILINATO',
    'LRP_REGISTROS_PUBLICOS',
    'LOMAN_LEI_ORGANICA_MAGISTRATURA',
    'LAT_ANTITERRORISMO',
    'LBPS_BENEFICIOS_PREVIDENCIA',
    'LCSS_CUSTEIO_SEGURIDADE',
    'LPC_PREVIDENCIA_COMPLEMENTAR'
  ];
  t text;
  short text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS public.%I (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        numero text NOT NULL,
        rotulo text,
        texto text NOT NULL DEFAULT ''''::text,
        caput text NOT NULL DEFAULT ''''::text,
        titulo text,
        capitulo text,
        incisos text[] DEFAULT ''{}''::text[],
        paragrafos text[] DEFAULT ''{}''::text[],
        ordem_numero numeric NOT NULL DEFAULT 0,
        ordem integer NOT NULL DEFAULT 0
      )', t);

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    short := lower(split_part(t, '_', 1));

    EXECUTE format('
      CREATE POLICY "Leitura pública %s" ON public.%I FOR SELECT USING (true)', short, t);
    EXECUTE format('
      CREATE POLICY "service_insert_%s" ON public.%I FOR INSERT TO service_role WITH CHECK (true)', short, t);
    EXECUTE format('
      CREATE POLICY "service_delete_%s" ON public.%I FOR DELETE TO service_role USING (true)', short, t);
  END LOOP;
END $$;
