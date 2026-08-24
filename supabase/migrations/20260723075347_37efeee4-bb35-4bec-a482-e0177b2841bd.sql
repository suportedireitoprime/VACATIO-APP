
CREATE TABLE public.peticoes_iniciais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL DEFAULT 'Nova petição',
  fatos_texto TEXT,
  audio_url TEXT,
  area_direito TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  resumo TEXT,
  pedidos JSONB NOT NULL DEFAULT '[]'::jsonb,
  partes JSONB NOT NULL DEFAULT '{}'::jsonb,
  dados_sensiveis JSONB NOT NULL DEFAULT '{}'::jsonb,
  peca_markdown TEXT,
  jurisprudencias JSONB NOT NULL DEFAULT '[]'::jsonb,
  fontes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'rascunho',
  etapa INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peticoes_iniciais TO authenticated;
GRANT ALL ON public.peticoes_iniciais TO service_role;

ALTER TABLE public.peticoes_iniciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own peticoes"
  ON public.peticoes_iniciais
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX peticoes_iniciais_user_updated_idx
  ON public.peticoes_iniciais (user_id, updated_at DESC);

CREATE TRIGGER peticoes_iniciais_updated_at
  BEFORE UPDATE ON public.peticoes_iniciais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_limits (feature_key, label, description, category, limit_value, period, enabled, sort_order)
SELECT 'peticao_inicial', 'Petição inicial com IA', 'Quantas petições iniciais o usuário free pode gerar por mês', 'ferramentas', 1, 'monthly', true, 100
WHERE NOT EXISTS (SELECT 1 FROM public.feature_limits WHERE feature_key = 'peticao_inicial');
