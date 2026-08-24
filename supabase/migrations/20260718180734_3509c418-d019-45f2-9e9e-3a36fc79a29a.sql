
CREATE TABLE public.assinatura_cancelamentos (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  canceled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo TEXT
);
GRANT SELECT, INSERT, DELETE ON public.assinatura_cancelamentos TO authenticated;
GRANT ALL ON public.assinatura_cancelamentos TO service_role;
ALTER TABLE public.assinatura_cancelamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own cancellation" ON public.assinatura_cancelamentos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
