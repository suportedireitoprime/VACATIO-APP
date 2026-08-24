
-- 1) Colunas de cruzamento em vade_mecum_leis
ALTER TABLE public.vade_mecum_leis
  ADD COLUMN IF NOT EXISTS numero_lei text,
  ADD COLUMN IF NOT EXISTS ano_lei integer;

CREATE INDEX IF NOT EXISTS idx_vade_mecum_leis_numero_ano
  ON public.vade_mecum_leis (numero_lei, ano_lei);

-- Popular numero_lei / ano_lei a partir do planalto_url (padrões comuns)
UPDATE public.vade_mecum_leis
SET
  numero_lei = COALESCE(numero_lei, (regexp_match(planalto_url, 'l(\d+)compilado?\.htm', 'i'))[1]),
  ano_lei    = COALESCE(ano_lei, NULLIF((regexp_match(planalto_url, '/(\d{4})/'))[1], '')::int)
WHERE planalto_url IS NOT NULL;

-- 2) Snapshots de verificação
CREATE TABLE IF NOT EXISTS public.vade_mecum_lei_snapshots (
  lei_id uuid PRIMARY KEY REFERENCES public.vade_mecum_leis(id) ON DELETE CASCADE,
  data_ultima_alteracao_detectada date,
  texto_hash text,
  raw_html_bytes integer,
  status text NOT NULL DEFAULT 'ok',
  ultimo_diff jsonb,
  verificado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vade_mecum_lei_snapshots TO authenticated;
GRANT ALL ON public.vade_mecum_lei_snapshots TO service_role;

ALTER TABLE public.vade_mecum_lei_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler snapshots"
  ON public.vade_mecum_lei_snapshots FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins podem gerenciar snapshots"
  ON public.vade_mecum_lei_snapshots FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_vade_mecum_lei_snapshots_updated_at
  BEFORE UPDATE ON public.vade_mecum_lei_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Impactos detectados pelo Radar
CREATE TABLE IF NOT EXISTS public.radar_impactos_leis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.radar_leis_runs(id) ON DELETE SET NULL,
  ato_id text,
  ato_url text,
  ato_ementa text,
  lei_id uuid NOT NULL REFERENCES public.vade_mecum_leis(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'altera',
  artigos_afetados jsonb NOT NULL DEFAULT '[]'::jsonb,
  resumo_ia text,
  status text NOT NULL DEFAULT 'pendente',
  aplicado_em timestamptz,
  aplicado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radar_impactos_lei_status
  ON public.radar_impactos_leis (lei_id, status);
CREATE INDEX IF NOT EXISTS idx_radar_impactos_created
  ON public.radar_impactos_leis (created_at DESC);

GRANT SELECT ON public.radar_impactos_leis TO authenticated;
GRANT ALL ON public.radar_impactos_leis TO service_role;

ALTER TABLE public.radar_impactos_leis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler impactos"
  ON public.radar_impactos_leis FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins podem gerenciar impactos"
  ON public.radar_impactos_leis FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_radar_impactos_leis_updated_at
  BEFORE UPDATE ON public.radar_impactos_leis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
