CREATE OR REPLACE FUNCTION public.admin_lista_provider(_tipo text, _provider text)
RETURNS TABLE(user_id uuid, email text, nome text, criado_em timestamptz, provider text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ids uuid[];
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RETURN;
  END IF;

  IF _tipo = 'online' THEN
    SELECT array_agg(DISTINCT l.user_id) INTO ids FROM public.user_activity_log l WHERE l.user_id IS NOT NULL;
  ELSIF _tipo = 'trial' THEN
    SELECT array_agg(DISTINCT s.user_id) INTO ids FROM public.play_subscriptions s WHERE s.user_id IS NOT NULL;
  ELSE
    SELECT array_agg(u.id) INTO ids FROM auth.users u;
  END IF;

  RETURN QUERY
  SELECT u.id,
         u.email::text,
         COALESCE(p.nome_completo, split_part(u.email::text, '@', 1))::text,
         u.created_at,
         CASE WHEN u.raw_app_meta_data->>'provider' IN ('google','apple')
              THEN u.raw_app_meta_data->>'provider' ELSE 'email' END::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = ANY(ids)
    AND (CASE WHEN u.raw_app_meta_data->>'provider' IN ('google','apple')
              THEN u.raw_app_meta_data->>'provider' ELSE 'email' END) = lower(_provider)
  ORDER BY u.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_lista_provider(text, text) TO authenticated;