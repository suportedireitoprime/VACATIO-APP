
CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asaas_customer_id text,
  asaas_subscription_id text,
  plano text NOT NULL CHECK (plano IN ('mensal', 'anual')),
  status text NOT NULL DEFAULT 'pending',
  payment_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.assinaturas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.assinaturas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.assinaturas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_assinaturas_updated_at
  BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
