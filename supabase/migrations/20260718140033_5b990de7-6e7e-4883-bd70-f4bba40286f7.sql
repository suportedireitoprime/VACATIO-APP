
CREATE EXTENSION IF NOT EXISTS vector;

-- Table 1: poderes registry
CREATE TABLE public.horus_poderes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'open_source',
  ativo BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_url TEXT,
  docs_url TEXT,
  icone TEXT,
  cor TEXT DEFAULT '#F59E0B',
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.horus_poderes TO anon, authenticated;
GRANT ALL ON public.horus_poderes TO service_role;
ALTER TABLE public.horus_poderes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read poderes" ON public.horus_poderes FOR SELECT USING (true);
CREATE POLICY "Admins manage poderes" ON public.horus_poderes FOR ALL
  USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE TRIGGER update_horus_poderes_updated_at BEFORE UPDATE ON public.horus_poderes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: call logs
CREATE TABLE public.horus_poderes_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poder_slug TEXT NOT NULL,
  user_phone TEXT,
  input JSONB,
  output JSONB,
  latency_ms INT,
  ok BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.horus_poderes_calls TO authenticated;
GRANT ALL ON public.horus_poderes_calls TO service_role;
ALTER TABLE public.horus_poderes_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read poderes calls" ON public.horus_poderes_calls FOR SELECT
  USING (public.is_admin_user(auth.uid()));
CREATE INDEX idx_poderes_calls_slug_time ON public.horus_poderes_calls (poder_slug, created_at DESC);

-- Table 3: long-term memory (Mem0-style via pgvector)
CREATE TABLE public.horus_memoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'fact',
  texto TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.horus_memoria TO authenticated;
GRANT ALL ON public.horus_memoria TO service_role;
ALTER TABLE public.horus_memoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read memoria" ON public.horus_memoria FOR SELECT
  USING (public.is_admin_user(auth.uid()));
CREATE INDEX idx_memoria_user ON public.horus_memoria (user_phone, created_at DESC);
CREATE INDEX idx_memoria_embedding ON public.horus_memoria USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RPC: match memories by embedding
CREATE OR REPLACE FUNCTION public.match_horus_memoria(
  _user_phone TEXT,
  _query_embedding vector(768),
  _match_count INT DEFAULT 3
)
RETURNS TABLE(id UUID, texto TEXT, kind TEXT, similarity FLOAT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id, texto, kind, 1 - (embedding <=> _query_embedding) AS similarity
  FROM public.horus_memoria
  WHERE user_phone = _user_phone AND embedding IS NOT NULL
  ORDER BY embedding <=> _query_embedding
  LIMIT greatest(_match_count, 1);
$$;

-- Seed the 6 poderes
INSERT INTO public.horus_poderes (slug, nome, categoria, descricao, tipo, ativo, base_url, docs_url, icone, cor, ordem, config) VALUES
('mem0', 'Memória Longa (Mem0)', 'memoria',
 'Horus lembra do que você estudou, preferências e dúvidas antigas entre conversas. Usa pgvector do próprio Supabase.',
 'open_source', true, NULL, 'https://github.com/mem0ai/mem0', 'Brain', '#A855F7', 1,
 '{"embedding_model":"google/gemini-embedding-001","top_k":3}'::jsonb),

('wikipedia', 'Wikipedia (PT)', 'conhecimento',
 'Base de conhecimento pública. Quando Horus tem dúvida sobre um conceito, pessoa ou instituição, consulta o resumo da Wiki PT antes de responder.',
 'api_publica', true, 'https://pt.wikipedia.org/w/api.php', 'https://www.mediawiki.org/wiki/API:Main_page', 'BookOpen', '#3B82F6', 2, '{}'::jsonb),

('brasilapi', 'BrasilAPI', 'utilidades_br',
 'Feriados nacionais, CEP, CNPJ, DDD, bancos. Usa pra calcular prazos processuais e validar dados de partes.',
 'open_source', true, 'https://brasilapi.com.br/api', 'https://brasilapi.com.br', 'MapPin', '#10B981', 3, '{}'::jsonb),

('bcb', 'Banco Central (BCB)', 'financeiro',
 'Selic, IPCA, câmbio em tempo real. Base pra cálculos de correção monetária e juros de mora.',
 'api_publica', true, 'https://dadosabertos.bcb.gov.br', 'https://dadosabertos.bcb.gov.br', 'DollarSign', '#F59E0B', 4, '{}'::jsonb),

('nager', 'Nager.Date', 'utilidades_br',
 'Feriados nacionais (backup do BrasilAPI, com anos futuros disponíveis).',
 'open_source', true, 'https://date.nager.at/api/v3', 'https://date.nager.at', 'Calendar', '#EC4899', 5, '{}'::jsonb),

('langfuse', 'Langfuse (Traces)', 'observabilidade',
 'Traces do Horus — você vê o que ele pensou, que ferramenta chamou, quanto custou. Requer instância self-host.',
 'open_source', false, NULL, 'https://github.com/langfuse/langfuse', 'Activity', '#EF4444', 6, '{}'::jsonb);
