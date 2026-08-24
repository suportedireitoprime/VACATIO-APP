
-- Tipo enum para categorias de legislação
CREATE TYPE public.tipo_legislacao AS ENUM (
  'constituicao', 'codigo', 'estatuto', 'lei-ordinaria', 'decreto', 'sumula'
);

-- Tabela principal de leis
CREATE TABLE public.leis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  tipo tipo_legislacao NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_publicacao TEXT,
  url_planalto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de artigos
CREATE TABLE public.artigos_lei (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lei_id UUID NOT NULL REFERENCES public.leis(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  caput TEXT NOT NULL DEFAULT '',
  titulo TEXT,
  capitulo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- Tabela de incisos
CREATE TABLE public.incisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artigo_id UUID NOT NULL REFERENCES public.artigos_lei(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- Tabela de parágrafos
CREATE TABLE public.paragrafos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artigo_id UUID NOT NULL REFERENCES public.artigos_lei(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- Índices para performance
CREATE INDEX idx_artigos_lei_id ON public.artigos_lei(lei_id);
CREATE INDEX idx_incisos_artigo_id ON public.incisos(artigo_id);
CREATE INDEX idx_paragrafos_artigo_id ON public.paragrafos(artigo_id);
CREATE INDEX idx_leis_tipo ON public.leis(tipo);

-- Full-text search no caput dos artigos
CREATE INDEX idx_artigos_caput_fts ON public.artigos_lei USING gin(to_tsvector('portuguese', caput));

-- RLS para leitura pública
ALTER TABLE public.leis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artigos_lei ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paragrafos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leis são públicas para leitura" ON public.leis FOR SELECT USING (true);
CREATE POLICY "Artigos são públicos para leitura" ON public.artigos_lei FOR SELECT USING (true);
CREATE POLICY "Incisos são públicos para leitura" ON public.incisos FOR SELECT USING (true);
CREATE POLICY "Parágrafos são públicos para leitura" ON public.paragrafos FOR SELECT USING (true);

-- Policies para inserção via service_role (edge functions)
CREATE POLICY "Service role pode inserir leis" ON public.leis FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role pode inserir artigos" ON public.artigos_lei FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role pode inserir incisos" ON public.incisos FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role pode inserir paragrafos" ON public.paragrafos FOR INSERT WITH CHECK (true);

-- Policies para delete via service_role
CREATE POLICY "Service role pode deletar leis" ON public.leis FOR DELETE USING (true);
CREATE POLICY "Service role pode deletar artigos" ON public.artigos_lei FOR DELETE USING (true);
CREATE POLICY "Service role pode deletar incisos" ON public.incisos FOR DELETE USING (true);
CREATE POLICY "Service role pode deletar paragrafos" ON public.paragrafos FOR DELETE USING (true);
