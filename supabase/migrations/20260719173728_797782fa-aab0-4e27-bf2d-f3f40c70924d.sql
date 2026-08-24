
-- Novas colunas para tracking de verificação e erros
ALTER TABLE public.vade_mecum_leis_estaduais_catalog
  ADD COLUMN IF NOT EXISTS revisao_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hash_conteudo TEXT,
  ADD COLUMN IF NOT EXISTS erro_populacao TEXT,
  ADD COLUMN IF NOT EXISTS titulo TEXT;

-- Snapshot da última verificação por UF (métricas)
CREATE TABLE IF NOT EXISTS public.vade_mecum_portal_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf TEXT NOT NULL,
  verificado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  por_tipo JSONB NOT NULL DEFAULT '{}'::jsonb,
  total INTEGER NOT NULL DEFAULT 0,
  novas INTEGER NOT NULL DEFAULT 0,
  removidas INTEGER NOT NULL DEFAULT 0,
  tempo_estimado_min INTEGER,
  duracao_verificacao_seg INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vade_mecum_portal_snapshots TO authenticated;
GRANT ALL ON public.vade_mecum_portal_snapshots TO service_role;

ALTER TABLE public.vade_mecum_portal_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_snapshots" ON public.vade_mecum_portal_snapshots
  FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_portal_snapshots_uf_data
  ON public.vade_mecum_portal_snapshots(uf, verificado_at DESC);

-- Estado atual do bulk runner por UF
CREATE TABLE IF NOT EXISTS public.vade_mecum_bulk_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','paused','done','error')),
  total INTEGER NOT NULL DEFAULT 0,
  processados INTEGER NOT NULL DEFAULT 0,
  sucessos INTEGER NOT NULL DEFAULT 0,
  falhas INTEGER NOT NULL DEFAULT 0,
  tempo_medio_ms INTEGER,
  ultimo_erro TEXT,
  iniciado_em TIMESTAMPTZ,
  finalizado_em TIMESTAMPTZ,
  next_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vade_mecum_bulk_runs TO authenticated;
GRANT ALL ON public.vade_mecum_bulk_runs TO service_role;

ALTER TABLE public.vade_mecum_bulk_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_bulk_runs" ON public.vade_mecum_bulk_runs
  FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS idx_bulk_runs_uf_active
  ON public.vade_mecum_bulk_runs(uf) WHERE status IN ('running','paused');

CREATE INDEX IF NOT EXISTS idx_catalog_status_uf
  ON public.vade_mecum_leis_estaduais_catalog(uf, status);
