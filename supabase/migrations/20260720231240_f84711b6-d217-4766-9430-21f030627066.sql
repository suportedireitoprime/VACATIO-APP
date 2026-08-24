
-- Tabela de eventos/metricas de engajamento das obras jurídicas
CREATE TABLE IF NOT EXISTS public.tematica_metricas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.tematica_juridica_obras(id) ON DELETE CASCADE,
  user_id UUID NULL,
  evento TEXT NOT NULL CHECK (evento IN ('view','click_provider','share','trailer_play')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tematica_metricas_obra ON public.tematica_metricas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tematica_metricas_created ON public.tematica_metricas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tematica_metricas_evento ON public.tematica_metricas(evento);

GRANT SELECT, INSERT ON public.tematica_metricas TO anon;
GRANT SELECT, INSERT ON public.tematica_metricas TO authenticated;
GRANT ALL ON public.tematica_metricas TO service_role;

ALTER TABLE public.tematica_metricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode registrar métrica"
  ON public.tematica_metricas FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Usuário vê seus próprios eventos"
  ON public.tematica_metricas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RPC: engajamento agregado por obra (últimos N dias)
CREATE OR REPLACE FUNCTION public.tematica_ranking_engajamento(periodo_dias INT DEFAULT 7)
RETURNS TABLE (
  obra_id UUID,
  views BIGINT,
  favoritos BIGINT,
  comentarios BIGINT,
  score NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH v AS (
    SELECT obra_id, COUNT(*)::BIGINT AS views
    FROM public.tematica_metricas
    WHERE evento = 'view'
      AND created_at >= now() - (periodo_dias || ' days')::INTERVAL
    GROUP BY obra_id
  ),
  f AS (
    SELECT obra_id, COUNT(*)::BIGINT AS favoritos
    FROM public.tematica_favoritos
    GROUP BY obra_id
  ),
  c AS (
    SELECT obra_id, COUNT(*)::BIGINT AS comentarios
    FROM public.tematica_comentarios
    GROUP BY obra_id
  )
  SELECT
    o.id AS obra_id,
    COALESCE(v.views, 0) AS views,
    COALESCE(f.favoritos, 0) AS favoritos,
    COALESCE(c.comentarios, 0) AS comentarios,
    (COALESCE(v.views,0)*2 + COALESCE(c.comentarios,0)*3 + COALESCE(f.favoritos,0)*2)::NUMERIC AS score
  FROM public.tematica_juridica_obras o
  LEFT JOIN v ON v.obra_id = o.id
  LEFT JOIN f ON f.obra_id = o.id
  LEFT JOIN c ON c.obra_id = o.id
  WHERE o.ativo = true;
$$;

GRANT EXECUTE ON FUNCTION public.tematica_ranking_engajamento(INT) TO anon, authenticated;
