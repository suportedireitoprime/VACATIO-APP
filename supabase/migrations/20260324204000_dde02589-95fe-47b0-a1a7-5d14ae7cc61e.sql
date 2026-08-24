CREATE TABLE IF NOT EXISTS public."CDC_CODIGO_DEFESA_CONSUMIDOR" (
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

ALTER TABLE public."CDC_CODIGO_DEFESA_CONSUMIDOR" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CDC" ON public."CDC_CODIGO_DEFESA_CONSUMIDOR" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CDC" ON public."CDC_CODIGO_DEFESA_CONSUMIDOR" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CDC" ON public."CDC_CODIGO_DEFESA_CONSUMIDOR" FOR DELETE TO public USING (true);

CREATE INDEX IF NOT EXISTS idx_cdc_ordem_numero ON public."CDC_CODIGO_DEFESA_CONSUMIDOR" (ordem_numero);