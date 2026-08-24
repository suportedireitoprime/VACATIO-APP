
-- Create 18 Estatuto tables with standard schema

-- Helper function to create estatuto table
DO $$ 
DECLARE
  tables text[] := ARRAY[
    'ECA_ESTATUTO_CRIANCA_ADOLESCENTE',
    'EI_ESTATUTO_IDOSO',
    'EPD_ESTATUTO_PESSOA_DEFICIENCIA',
    'EIR_ESTATUTO_IGUALDADE_RACIAL',
    'EC_ESTATUTO_CIDADE',
    'ED_ESTATUTO_DESARMAMENTO',
    'EOAB_ESTATUTO_OAB',
    'ET_ESTATUTO_TORCEDOR',
    'EJ_ESTATUTO_JUVENTUDE',
    'EM_ESTATUTO_MILITARES',
    'EIND_ESTATUTO_INDIO',
    'ETERRA_ESTATUTO_TERRA',
    'EMIG_ESTATUTO_MIGRACAO',
    'EREF_ESTATUTO_REFUGIADO',
    'EMET_ESTATUTO_METROPOLE',
    'EMUS_ESTATUTO_MUSEUS',
    'EME_ESTATUTO_MICROEMPRESA',
    'EPC_ESTATUTO_PESSOA_CANCER'
  ];
  t text;
  short_name text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS public.%I (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        numero text NOT NULL,
        rotulo text,
        texto text NOT NULL DEFAULT ''''::text,
        caput text NOT NULL DEFAULT ''''::text,
        ordem integer NOT NULL DEFAULT 0,
        ordem_numero numeric NOT NULL DEFAULT 0,
        titulo text,
        capitulo text,
        incisos text[] DEFAULT ''{}'',
        paragrafos text[] DEFAULT ''{}''
      )', t);

    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_ordem ON public.%I (ordem_numero)', lower(t), t);
    
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Extract short name for policy naming
    short_name := split_part(t, '_', 1);

    EXECUTE format('
      CREATE POLICY "Leitura pública %s" ON public.%I FOR SELECT TO public USING (true)', short_name, t);
    EXECUTE format('
      CREATE POLICY "Inserção %s" ON public.%I FOR INSERT TO public WITH CHECK (true)', short_name, t);
    EXECUTE format('
      CREATE POLICY "Deleção %s" ON public.%I FOR DELETE TO public USING (true)', short_name, t);
  END LOOP;
END $$;
