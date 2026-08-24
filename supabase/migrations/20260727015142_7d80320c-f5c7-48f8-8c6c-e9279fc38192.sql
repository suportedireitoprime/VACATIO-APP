CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = _user_id
        AND lower(u.email) IN ('wn7corporation@gmail.com','suporte.vacatio@gmail.com','wn7juridico@gmail.com')
    );
$$;