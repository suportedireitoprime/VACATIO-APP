
-- 1) Novos campos em aprender_aulas para vincular a um livro da biblioteca
ALTER TABLE public.aprender_aulas
  ADD COLUMN IF NOT EXISTS livro_origem_id UUID REFERENCES public.biblioteca_leitura_nativa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capitulo_ref JSONB,
  ADD COLUMN IF NOT EXISTS fontes_web JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_aprender_aulas_livro ON public.aprender_aulas(livro_origem_id);

-- 2) Novo campo markdown em aprender_blocos + atualização do CHECK de tipos
ALTER TABLE public.aprender_blocos
  ADD COLUMN IF NOT EXISTS markdown TEXT;

ALTER TABLE public.aprender_blocos DROP CONSTRAINT IF EXISTS aprender_blocos_tipo_check;
ALTER TABLE public.aprender_blocos ADD CONSTRAINT aprender_blocos_tipo_check
  CHECK (tipo IN (
    'leitura','pergunta','flashcard','conexao',
    'citacao','artigo_lei','tabela','mapa_mental','infografico','linha_tempo','destaque'
  ));

-- 3) Tabela de sumário sugerido pela IA (para o admin aprovar antes de gerar aulas)
CREATE TABLE IF NOT EXISTS public.aprender_sumario_sugerido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_id UUID NOT NULL REFERENCES public.biblioteca_leitura_nativa(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.aprender_areas(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  titulo_original TEXT,
  titulo_melhorado TEXT NOT NULL,
  resumo_capitulo TEXT,
  capitulo_ref JSONB,
  aprovado BOOLEAN NOT NULL DEFAULT false,
  aula_id UUID REFERENCES public.aprender_aulas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprender_sumario_sugerido TO authenticated;
GRANT ALL ON public.aprender_sumario_sugerido TO service_role;
ALTER TABLE public.aprender_sumario_sugerido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins gerenciam sumario sugerido"
  ON public.aprender_sumario_sugerido FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) IN ('wn7corporation@gmail.com','suporte.vacatio@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) IN ('wn7corporation@gmail.com','suporte.vacatio@gmail.com')
    )
  );

CREATE INDEX IF NOT EXISTS idx_sumario_livro ON public.aprender_sumario_sugerido(livro_id, ordem);

-- 4) Cache de pesquisas web (Firecrawl) para reuso e economia
CREATE TABLE IF NOT EXISTS public.aprender_livro_pesquisa_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  resultado JSONB NOT NULL,
  fonte TEXT DEFAULT 'firecrawl',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

GRANT SELECT ON public.aprender_livro_pesquisa_cache TO authenticated;
GRANT ALL ON public.aprender_livro_pesquisa_cache TO service_role;
ALTER TABLE public.aprender_livro_pesquisa_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura do cache para autenticados"
  ON public.aprender_livro_pesquisa_cache FOR SELECT TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_pesquisa_cache_expira ON public.aprender_livro_pesquisa_cache(expires_at);

-- 5) Trigger de updated_at para a nova tabela de sumário
CREATE OR REPLACE FUNCTION public.tg_sumario_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sumario_touch ON public.aprender_sumario_sugerido;
CREATE TRIGGER trg_sumario_touch
  BEFORE UPDATE ON public.aprender_sumario_sugerido
  FOR EACH ROW EXECUTE FUNCTION public.tg_sumario_touch();
