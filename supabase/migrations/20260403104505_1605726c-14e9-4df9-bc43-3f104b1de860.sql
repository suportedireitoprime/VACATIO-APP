
-- Tabela de inscrições de newsletter
CREATE TABLE public.newsletter_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  preferencias JSONB NOT NULL DEFAULT '{"noticias": true, "leis_do_dia": true, "radar_legislativo": true, "leis_monitoradas": []}'::jsonb,
  hora_envio TIME NOT NULL DEFAULT '07:00:00',
  ultimo_envio TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.newsletter_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscription"
  ON public.newsletter_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.newsletter_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription"
  ON public.newsletter_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role policy for the edge function
CREATE POLICY "Service role full access"
  ON public.newsletter_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
