CREATE TABLE public.radar_ranking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deputado_id integer NOT NULL,
  nome text,
  sigla_partido text,
  sigla_uf text,
  foto_url text,
  total_despesas numeric DEFAULT 0,
  total_proposicoes integer DEFAULT 0,
  presenca_percentual numeric DEFAULT 0,
  ano integer DEFAULT 2025,
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(deputado_id, ano)
);
ALTER TABLE public.radar_ranking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranking_public_read" ON public.radar_ranking FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ranking_insert" ON public.radar_ranking FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "ranking_delete" ON public.radar_ranking FOR DELETE TO anon, authenticated USING (true);