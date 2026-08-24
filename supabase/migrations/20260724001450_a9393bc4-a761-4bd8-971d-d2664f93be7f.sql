CREATE TABLE public.aprender_tema_respostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tema_id UUID NOT NULL,
  bloco_id UUID NOT NULL,
  acertou BOOLEAN NOT NULL,
  escolha TEXT,
  respondida_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, bloco_id)
);

CREATE INDEX idx_aprender_tema_respostas_user_tema
  ON public.aprender_tema_respostas (user_id, tema_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprender_tema_respostas TO authenticated;
GRANT ALL ON public.aprender_tema_respostas TO service_role;

ALTER TABLE public.aprender_tema_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own tema responses"
  ON public.aprender_tema_respostas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);