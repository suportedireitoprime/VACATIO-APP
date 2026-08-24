CREATE TABLE IF NOT EXISTS public.narracoes_artigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  lei_nome text NOT NULL,
  titulo_artigo text,
  audio_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tabela_nome, artigo_numero)
);

GRANT SELECT ON public.narracoes_artigos TO anon;
GRANT SELECT ON public.narracoes_artigos TO authenticated;
GRANT ALL ON public.narracoes_artigos TO service_role;

ALTER TABLE public.narracoes_artigos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública" ON public.narracoes_artigos;
DROP POLICY IF EXISTS "Insert público" ON public.narracoes_artigos;
DROP POLICY IF EXISTS "narracoes_select_public" ON public.narracoes_artigos;
DROP POLICY IF EXISTS "narracoes_service_role_all" ON public.narracoes_artigos;

CREATE POLICY "narracoes_select_public"
ON public.narracoes_artigos
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "narracoes_service_role_all"
ON public.narracoes_artigos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);