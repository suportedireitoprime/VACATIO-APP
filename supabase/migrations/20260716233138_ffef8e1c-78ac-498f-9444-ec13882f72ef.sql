-- 1) Update is_admin_user to accept both admin emails
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) IN ('wn7corporation@gmail.com','suporte.vacatio@gmail.com')
  );
$function$;

-- 2) Trigger to grant eternal Premium for suporte.vacatio when the account is created/confirmed
CREATE OR REPLACE FUNCTION public.grant_premium_forever_for_suporte()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.email) = 'suporte.vacatio@gmail.com' THEN
    INSERT INTO public.user_subscriptions (user_id, product_id, status, expires_at)
    VALUES (NEW.id, 'anual', 'active', '2099-12-31T00:00:00Z'::timestamptz)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_suporte_premium ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_suporte_premium
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_premium_forever_for_suporte();

-- 3) If the suporte user already exists, backfill the subscription now
INSERT INTO public.user_subscriptions (user_id, product_id, status, expires_at)
SELECT u.id, 'anual', 'active', '2099-12-31T00:00:00Z'::timestamptz
FROM auth.users u
WHERE lower(u.email) = 'suporte.vacatio@gmail.com'
ON CONFLICT DO NOTHING;