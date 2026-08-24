
CREATE TABLE IF NOT EXISTS public.vade_mecum_leis_estaduais_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf text NOT NULL,
  tipo text NOT NULL,
  numero text,
  ano integer,
  ementa text,
  data_publicacao date,
  url_original text NOT NULL,
  url_texto_integral text,
  status text NOT NULL DEFAULT 'descoberto',
  lei_id uuid REFERENCES public.vade_mecum_leis(id) ON DELETE SET NULL,
  hash_texto text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uf, tipo, numero, ano)
);

CREATE INDEX IF NOT EXISTS idx_estadual_catalog_uf_tipo ON public.vade_mecum_leis_estaduais_catalog (uf, tipo, ano DESC NULLS LAST, numero DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_estadual_catalog_status ON public.vade_mecum_leis_estaduais_catalog (status);
CREATE INDEX IF NOT EXISTS idx_estadual_catalog_url ON public.vade_mecum_leis_estaduais_catalog (url_original);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vade_mecum_leis_estaduais_catalog TO authenticated;
GRANT ALL ON public.vade_mecum_leis_estaduais_catalog TO service_role;

ALTER TABLE public.vade_mecum_leis_estaduais_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read estadual catalog"
  ON public.vade_mecum_leis_estaduais_catalog FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert estadual catalog"
  ON public.vade_mecum_leis_estaduais_catalog FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update estadual catalog"
  ON public.vade_mecum_leis_estaduais_catalog FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete estadual catalog"
  ON public.vade_mecum_leis_estaduais_catalog FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_estadual_catalog_updated_at
  BEFORE UPDATE ON public.vade_mecum_leis_estaduais_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
