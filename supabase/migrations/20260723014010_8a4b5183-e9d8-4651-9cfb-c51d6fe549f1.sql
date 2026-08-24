CREATE TABLE IF NOT EXISTS public.apple_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  original_transaction_id TEXT NOT NULL UNIQUE,
  latest_transaction_id TEXT,
  bundle_id TEXT,
  environment TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  auto_renewing BOOLEAN NOT NULL DEFAULT true,
  start_time TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  cancel_reason TEXT,
  latest_notification_type TEXT,
  latest_notification_subtype TEXT,
  latest_notification_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apple_subscriptions TO authenticated;
GRANT ALL ON public.apple_subscriptions TO service_role;
ALTER TABLE public.apple_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuarios leem suas apple subs" ON public.apple_subscriptions;
CREATE POLICY "Usuarios leem suas apple subs" ON public.apple_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_apple_subscriptions_user_id ON public.apple_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_subscriptions_status ON public.apple_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_apple_subscriptions_expires_at ON public.apple_subscriptions(expires_at);
DROP TRIGGER IF EXISTS trg_apple_subscriptions_updated_at ON public.apple_subscriptions;
CREATE TRIGGER trg_apple_subscriptions_updated_at BEFORE UPDATE ON public.apple_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.play_subscriptions
      WHERE user_id = _user_id
        AND status IN ('SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD')
        AND (expires_at IS NULL OR expires_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.apple_subscriptions
      WHERE user_id = _user_id
        AND status IN ('active','in_grace')
        AND (expires_at IS NULL OR expires_at > now())
    );
$$;
GRANT EXECUTE ON FUNCTION public.is_premium_user(UUID) TO authenticated, anon;