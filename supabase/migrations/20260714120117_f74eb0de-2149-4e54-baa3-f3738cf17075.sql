-- 1. Enum para status normalizado (baseado nos estados da SubscriptionPurchaseV2 do Google)
CREATE TYPE public.play_subscription_status AS ENUM (
  'SUBSCRIPTION_STATE_UNSPECIFIED',
  'SUBSCRIPTION_STATE_PENDING',
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_PAUSED',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_ON_HOLD',
  'SUBSCRIPTION_STATE_CANCELED',
  'SUBSCRIPTION_STATE_EXPIRED'
);

-- 2. Tabela principal
CREATE TABLE public.play_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  base_plan_id TEXT,
  purchase_token TEXT NOT NULL UNIQUE,
  order_id TEXT,
  status public.play_subscription_status NOT NULL DEFAULT 'SUBSCRIPTION_STATE_UNSPECIFIED',
  auto_renewing BOOLEAN NOT NULL DEFAULT true,
  start_time TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancel_reason TEXT,
  latest_notification_type INTEGER,
  latest_notification_at TIMESTAMPTZ,
  linked_purchase_token TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. GRANTs (obrigatório no schema public)
GRANT SELECT ON public.play_subscriptions TO authenticated;
GRANT ALL ON public.play_subscriptions TO service_role;

-- 4. RLS
ALTER TABLE public.play_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários leem apenas suas próprias assinaturas"
  ON public.play_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- (sem policy de INSERT/UPDATE/DELETE: só service_role pode escrever)

-- 5. Índices
CREATE INDEX idx_play_subscriptions_user_id ON public.play_subscriptions(user_id);
CREATE INDEX idx_play_subscriptions_status ON public.play_subscriptions(status);
CREATE INDEX idx_play_subscriptions_expires_at ON public.play_subscriptions(expires_at);

-- 6. Trigger updated_at (função update_updated_at_column já existe)
CREATE TRIGGER trg_play_subscriptions_updated_at
  BEFORE UPDATE ON public.play_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Helper para saber se o usuário é premium ativo (usado pelo front via RPC/policy)
CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.play_subscriptions
    WHERE user_id = _user_id
      AND status IN (
        'SUBSCRIPTION_STATE_ACTIVE',
        'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
      )
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_premium_user(UUID) TO authenticated, anon;