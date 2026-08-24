
-- Adicionar coluna tabela_nome na tabela leis
ALTER TABLE public.leis ADD COLUMN tabela_nome text;

-- Criar tabela do Código Penal como primeira tabela individual
CREATE TABLE public."CP_CODIGO_PENAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  caput text NOT NULL DEFAULT '',
  titulo text,
  capitulo text,
  ordem integer NOT NULL DEFAULT 0,
  incisos text[] DEFAULT '{}',
  paragrafos text[] DEFAULT '{}'
);

ALTER TABLE public."CP_CODIGO_PENAL" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CP" ON public."CP_CODIGO_PENAL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CP" ON public."CP_CODIGO_PENAL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CP" ON public."CP_CODIGO_PENAL" FOR DELETE TO public USING (true);
