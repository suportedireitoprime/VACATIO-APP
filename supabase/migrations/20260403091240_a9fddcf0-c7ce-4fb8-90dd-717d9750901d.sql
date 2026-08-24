
CREATE TABLE public.kanban_proposicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_externo TEXT NOT NULL,
  sigla_tipo TEXT NOT NULL,
  numero INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  ementa TEXT,
  autor TEXT,
  lei_afetada TEXT,
  status_kanban TEXT NOT NULL DEFAULT 'tramitando',
  situacao_camara TEXT,
  data_ultima_acao TIMESTAMPTZ,
  data_votacao TIMESTAMPTZ,
  resultado_votacao TEXT,
  data_publicacao TIMESTAMPTZ,
  numero_lei_publicada TEXT,
  dados_json JSONB,
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id_externo)
);

ALTER TABLE public.kanban_proposicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_read" ON public.kanban_proposicoes
  FOR SELECT USING (true);

CREATE INDEX idx_kanban_status ON public.kanban_proposicoes (status_kanban);
CREATE INDEX idx_kanban_lei_afetada ON public.kanban_proposicoes (lei_afetada);
CREATE INDEX idx_kanban_atualizado ON public.kanban_proposicoes (atualizado_em DESC);
