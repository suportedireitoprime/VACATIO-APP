
CREATE TABLE IF NOT EXISTS public.resenha_diaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ato text NOT NULL,
  numero_ato text NOT NULL,
  ementa text NOT NULL,
  url text NOT NULL UNIQUE,
  texto_completo text,
  explicacao text,
  data_publicacao text NOT NULL,
  data_dou date NOT NULL,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.resenha_diaria TO anon, authenticated;
GRANT ALL ON public.resenha_diaria TO service_role;

ALTER TABLE public.resenha_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read resenha" ON public.resenha_diaria;
CREATE POLICY "Public read resenha" ON public.resenha_diaria FOR SELECT USING (true);

DROP POLICY IF EXISTS "service_role_insert" ON public.resenha_diaria;
CREATE POLICY "service_role_insert" ON public.resenha_diaria FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_update" ON public.resenha_diaria;
CREATE POLICY "service_role_update" ON public.resenha_diaria FOR UPDATE TO service_role USING (true);

DROP POLICY IF EXISTS "service_role_delete" ON public.resenha_diaria;
CREATE POLICY "service_role_delete" ON public.resenha_diaria FOR DELETE TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_resenha_data ON public.resenha_diaria(data_dou DESC);
