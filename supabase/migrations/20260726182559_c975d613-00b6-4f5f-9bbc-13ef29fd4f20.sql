CREATE OR REPLACE FUNCTION public.admin_totais(_tipo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ids uuid[];
  res jsonb;
  hoje timestamptz := date_trunc('day', now());
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF _tipo = 'online' THEN
    SELECT array_agg(DISTINCT user_id) INTO ids FROM public.user_activity_log WHERE user_id IS NOT NULL;
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (SELECT count(DISTINCT user_id) FROM public.user_activity_log WHERE last_seen_at >= hoje),
      'd7',   (SELECT count(DISTINCT user_id) FROM public.user_activity_log WHERE last_seen_at >= now() - interval '7 days'),
      'd30',  (SELECT count(DISTINCT user_id) FROM public.user_activity_log WHERE last_seen_at >= now() - interval '30 days')
    );
  ELSIF _tipo = 'trial' THEN
    SELECT array_agg(DISTINCT user_id) INTO ids FROM public.play_subscriptions WHERE user_id IS NOT NULL;
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (SELECT count(DISTINCT user_id) FROM public.play_subscriptions WHERE created_at >= hoje),
      'd7',   (SELECT count(DISTINCT user_id) FROM public.play_subscriptions WHERE created_at >= now() - interval '7 days'),
      'd30',  (SELECT count(DISTINCT user_id) FROM public.play_subscriptions WHERE created_at >= now() - interval '30 days')
    );
  ELSE
    SELECT array_agg(id) INTO ids FROM auth.users;
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (SELECT count(*) FROM auth.users WHERE created_at >= hoje),
      'd7',   (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '7 days'),
      'd30',  (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '30 days')
    );
  END IF;

  RETURN res
    || jsonb_build_object(
      'providers', coalesce((
        SELECT jsonb_object_agg(p, c) FROM (
          SELECT CASE
                   WHEN u.raw_app_meta_data->>'provider' IN ('google','apple') THEN u.raw_app_meta_data->>'provider'
                   ELSE 'email'
                 END AS p,
                 count(*) AS c
          FROM auth.users u
          WHERE u.id = ANY(ids)
          GROUP BY 1
        ) t
      ), '{}'::jsonb),
      'premium', (SELECT count(*) FROM public.profiles WHERE id = ANY(ids) AND is_premium),
      'com_telefone', (SELECT count(*) FROM public.profiles WHERE id = ANY(ids) AND coalesce(whatsapp_number, telefone) IS NOT NULL),
      'onboarding', (SELECT count(*) FROM public.profiles WHERE id = ANY(ids) AND onboarding_completed_at IS NOT NULL),
      'paises', coalesce((
        SELECT jsonb_agg(jsonb_build_object('pais', pais, 'total', c) ORDER BY c DESC)
        FROM (
          SELECT coalesce(pais,'Não informado') AS pais, count(*) AS c
          FROM public.profiles WHERE id = ANY(ids) GROUP BY 1 ORDER BY 2 DESC LIMIT 6
        ) g
      ), '[]'::jsonb)
    );
END;
$$;