CREATE TABLE IF NOT EXISTS public."CTB_CODIGO_TRANSITO_BRASILEIRO" (
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

ALTER TABLE public."CTB_CODIGO_TRANSITO_BRASILEIRO" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CTB" ON public."CTB_CODIGO_TRANSITO_BRASILEIRO" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CTB" ON public."CTB_CODIGO_TRANSITO_BRASILEIRO" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CTB" ON public."CTB_CODIGO_TRANSITO_BRASILEIRO" FOR DELETE TO public USING (true);

CREATE INDEX IF NOT EXISTS idx_ctb_ordem_numero ON public."CTB_CODIGO_TRANSITO_BRASILEIRO" (ordem_numero);