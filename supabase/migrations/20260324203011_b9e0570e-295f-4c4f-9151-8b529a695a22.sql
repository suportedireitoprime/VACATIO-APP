CREATE TABLE IF NOT EXISTS public."CLT_CONSOLIDACAO_LEIS_TRABALHO" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  rotulo text,
  texto text NOT NULL DEFAULT ''::text,
  caput text NOT NULL DEFAULT ''::text,
  titulo text,
  capitulo text,
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[]
);

ALTER TABLE public."CLT_CONSOLIDACAO_LEIS_TRABALHO" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CLT" ON public."CLT_CONSOLIDACAO_LEIS_TRABALHO" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CLT" ON public."CLT_CONSOLIDACAO_LEIS_TRABALHO" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CLT" ON public."CLT_CONSOLIDACAO_LEIS_TRABALHO" FOR DELETE TO public USING (true);

CREATE INDEX IF NOT EXISTS idx_clt_ordem_numero ON public."CLT_CONSOLIDACAO_LEIS_TRABALHO" (ordem_numero);