
CREATE TABLE public.resumos_juridicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id bigint UNIQUE,
  area text NOT NULL,
  tema text NOT NULL,
  subtema text,
  ordem_tema int,
  ordem_subtema int,
  markdown text,
  exemplos text,
  termos text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.resumos_juridicos TO anon;
GRANT SELECT ON public.resumos_juridicos TO authenticated;
GRANT ALL ON public.resumos_juridicos TO service_role;

ALTER TABLE public.resumos_juridicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read resumos_juridicos"
  ON public.resumos_juridicos FOR SELECT
  USING (true);

CREATE INDEX idx_resumos_area ON public.resumos_juridicos(area);
CREATE INDEX idx_resumos_area_tema ON public.resumos_juridicos(area, tema);
CREATE INDEX idx_resumos_ordem ON public.resumos_juridicos(area, ordem_tema, ordem_subtema);

CREATE TRIGGER trg_resumos_juridicos_updated_at
  BEFORE UPDATE ON public.resumos_juridicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
