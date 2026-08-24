CREATE TABLE IF NOT EXISTS public."CPP_CODIGO_PROCESSO_PENAL" (
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

ALTER TABLE public."CPP_CODIGO_PROCESSO_PENAL" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CPP" ON public."CPP_CODIGO_PROCESSO_PENAL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CPP" ON public."CPP_CODIGO_PROCESSO_PENAL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CPP" ON public."CPP_CODIGO_PROCESSO_PENAL" FOR DELETE TO public USING (true);

CREATE INDEX idx_cpp_ordem ON public."CPP_CODIGO_PROCESSO_PENAL" (ordem_numero);