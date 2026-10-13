-- ==============================================================================
-- Tabela para Gerenciamento de Imagens e Prompts de Aulas de Legislação (MCP Gemini Spark)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.aprender_leis_imagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lei_id TEXT NOT NULL,                          -- Ex: 'codigo_penal', 'cf88'
  artigo_numero TEXT NOT NULL,                   -- Ex: 'Art. 1º', 'Art. 5º'
  dispositivo TEXT DEFAULT 'Caput',              -- Ex: 'Caput', 'Inciso I', 'Parágrafo único'
  slide_ordem INTEGER NOT NULL DEFAULT 1,        -- Ordem do slide na aula
  slide_titulo TEXT NOT NULL,                    -- Título amigável do slide
  image_prompt TEXT NOT NULL,                    -- Prompt rico formulado para o Gemini / Imagen
  image_url TEXT,                                -- URL pública final no Supabase Storage
  storage_path TEXT,                             -- Caminho relativo dentro do bucket
  status TEXT NOT NULL DEFAULT 'pending',        -- 'pending' | 'ready' | 'failed'
  dimensao TEXT DEFAULT '16:9',                  -- '16:9' | '1:1' | '4:3'
  metadata JSONB DEFAULT '{}'::jsonb,            -- Dados adicionais e configurações
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas rápidas pelo MCP
CREATE INDEX IF NOT EXISTS idx_aprender_leis_imagens_status ON public.aprender_leis_imagens(status);
CREATE INDEX IF NOT EXISTS idx_aprender_leis_imagens_lei_art ON public.aprender_leis_imagens(lei_id, artigo_numero);

-- RLS (Row Level Security)
ALTER TABLE public.aprender_leis_imagens ENABLE ROW LEVEL SECURITY;

-- Leitura pública para todos os alunos visualizarem as imagens nas aulas
CREATE POLICY "Leitura pública de aprender_leis_imagens"
ON public.aprender_leis_imagens FOR SELECT
TO public
USING (true);

-- Permissão total para inserção e atualização
CREATE POLICY "Operações públicas/admin em aprender_leis_imagens"
ON public.aprender_leis_imagens FOR ALL
TO public
USING (true)
WITH CHECK (true);
