CREATE TABLE public.sumulas_favoritos (
  user_id uuid NOT NULL,
  tribunal text NOT NULL CHECK (tribunal IN ('STF_VINCULANTE', 'STF', 'STJ')),
  sumula_numero integer NOT NULL CHECK (sumula_numero > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tribunal, sumula_numero)
);

GRANT ALL ON public.sumulas_favoritos TO service_role;

ALTER TABLE public.sumulas_favoritos ENABLE ROW LEVEL SECURITY;

CREATE INDEX sumulas_favoritos_user_tribunal_created_idx
  ON public.sumulas_favoritos (user_id, tribunal, created_at DESC);