CREATE TABLE IF NOT EXISTS public."CC_CODIGO_CIVIL" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  rotulo text,
  texto text NOT NULL DEFAULT ''::text,
  caput text NOT NULL DEFAULT ''::text,
  ordem_numero numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  titulo text,
  capitulo text,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[],
  CONSTRAINT "CC_CODIGO_CIVIL_pkey" PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_cc_codigo_civil_ordem ON public."CC_CODIGO_CIVIL" (ordem_numero ASC);

ALTER TABLE public."CC_CODIGO_CIVIL" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CC" ON public."CC_CODIGO_CIVIL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CC" ON public."CC_CODIGO_CIVIL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CC" ON public."CC_CODIGO_CIVIL" FOR DELETE TO public USING (true);