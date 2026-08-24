CREATE TABLE public."CTN_CODIGO_TRIBUTARIO_NACIONAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  rotulo text,
  texto text NOT NULL DEFAULT '',
  caput text NOT NULL DEFAULT '',
  titulo text,
  capitulo text,
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[]
);

ALTER TABLE public."CTN_CODIGO_TRIBUTARIO_NACIONAL" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CTN" ON public."CTN_CODIGO_TRIBUTARIO_NACIONAL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CTN" ON public."CTN_CODIGO_TRIBUTARIO_NACIONAL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CTN" ON public."CTN_CODIGO_TRIBUTARIO_NACIONAL" FOR DELETE TO public USING (true);

CREATE INDEX idx_ctn_ordem_numero ON public."CTN_CODIGO_TRIBUTARIO_NACIONAL" (ordem_numero);