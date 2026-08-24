
-- 1) Última reextração por lei
ALTER TABLE public.vade_mecum_leis
  ADD COLUMN IF NOT EXISTS ultima_reextracao_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultima_reextracao_por uuid;

-- 2) Vincular impacto do Radar ao artigo (quando identificado)
ALTER TABLE public.radar_impactos_leis
  ADD COLUMN IF NOT EXISTS artigo_id uuid REFERENCES public.vade_mecum_artigos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artigo_numero text;

-- 3) Índices para listagem "Atualizações disponíveis"
CREATE INDEX IF NOT EXISTS radar_impactos_leis_lei_status_idx
  ON public.radar_impactos_leis(lei_id, status);

CREATE INDEX IF NOT EXISTS radar_impactos_leis_status_created_idx
  ON public.radar_impactos_leis(status, created_at DESC);
