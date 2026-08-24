CREATE TABLE IF NOT EXISTS public."CPC_CODIGO_PROCESSO_CIVIL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  rotulo text,
  texto text NOT NULL DEFAULT '',
  caput text NOT NULL DEFAULT '',
  ordem_numero numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  titulo text,
  capitulo text,
  incisos text[] DEFAULT '{}',
  paragrafos text[] DEFAULT '{}'
);

ALTER TABLE public."CPC_CODIGO_PROCESSO_CIVIL" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CPC" ON public."CPC_CODIGO_PROCESSO_CIVIL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CPC" ON public."CPC_CODIGO_PROCESSO_CIVIL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CPC" ON public."CPC_CODIGO_PROCESSO_CIVIL" FOR DELETE TO public USING (true);

CREATE INDEX idx_cpc_ordem ON public."CPC_CODIGO_PROCESSO_CIVIL" (ordem_numero);