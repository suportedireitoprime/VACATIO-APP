
CREATE TABLE public.concorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  package_id text NOT NULL,
  url text NOT NULL,
  hl text NOT NULL DEFAULT 'pt_BR',
  total_reviews integer NOT NULL DEFAULT 0,
  avg_rating numeric(3,2),
  ultima_extracao_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concorrentes TO authenticated;
GRANT ALL ON public.concorrentes TO service_role;
ALTER TABLE public.concorrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins gerenciam concorrentes"
  ON public.concorrentes FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER trg_concorrentes_updated_at
  BEFORE UPDATE ON public.concorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.concorrente_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concorrente_id uuid NOT NULL REFERENCES public.concorrentes(id) ON DELETE CASCADE,
  review_hash text NOT NULL,
  autor text,
  rating integer,
  data_publicacao date,
  ano integer,
  texto text,
  resposta_dev text,
  helpful_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concorrente_id, review_hash)
);
CREATE INDEX idx_concorrente_reviews_conc ON public.concorrente_reviews(concorrente_id, data_publicacao DESC);
CREATE INDEX idx_concorrente_reviews_rating ON public.concorrente_reviews(concorrente_id, rating);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concorrente_reviews TO authenticated;
GRANT ALL ON public.concorrente_reviews TO service_role;
ALTER TABLE public.concorrente_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins gerenciam concorrente_reviews"
  ON public.concorrente_reviews FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TABLE public.concorrente_analises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concorrente_id uuid NOT NULL REFERENCES public.concorrentes(id) ON DELETE CASCADE,
  resumo jsonb NOT NULL,
  total_analisado integer NOT NULL DEFAULT 0,
  modelo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_concorrente_analises_conc ON public.concorrente_analises(concorrente_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concorrente_analises TO authenticated;
GRANT ALL ON public.concorrente_analises TO service_role;
ALTER TABLE public.concorrente_analises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins gerenciam concorrente_analises"
  ON public.concorrente_analises FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));
