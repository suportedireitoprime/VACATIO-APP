-- Fix admin metrics functions, RPC definitions, and server-side last_seen_at trigger.

-- 1. is_admin_user (includes all 3 admin emails)
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) IN ('wn7corporation@gmail.com', 'suporte.vacatio@gmail.com', 'wn7juridico@gmail.com')
  );
$$;

-- 2. Trigger on user_activity_log to ensure last_seen_at is always server now()
CREATE OR REPLACE FUNCTION public.trg_user_activity_log_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent any client clock skew (future or past) from setting invalid last_seen_at
  NEW.last_seen_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_last_seen ON public.user_activity_log;
CREATE TRIGGER trg_set_last_seen
  BEFORE INSERT OR UPDATE ON public.user_activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_user_activity_log_last_seen();

-- 3. admin_metricas_dia
CREATE OR REPLACE FUNCTION public.admin_metricas_dia(_dia date)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.is_admin_user(auth.uid()) THEN jsonb_build_object(
    'online', (SELECT COUNT(DISTINCT a.user_id) FROM public.user_activity_log a
      WHERE a.last_seen_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND a.last_seen_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND NOT public.is_admin_user(a.user_id)),
    'cadastros', (SELECT COUNT(*) FROM public.profiles p
      WHERE p.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND p.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND NOT public.is_admin_user(p.id)),
    'trial', (SELECT COUNT(*) FROM public.play_subscriptions s
      WHERE s.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND s.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND NOT public.is_admin_user(s.user_id))
  ) ELSE jsonb_build_object('online',0,'cadastros',0,'trial',0) END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_metricas_dia(date) TO authenticated;

-- 4. admin_lista_dia
DROP FUNCTION IF EXISTS public.admin_lista_dia(text, date);
CREATE OR REPLACE FUNCTION public.admin_lista_dia(_tipo text, _dia date)
RETURNS TABLE(key text, user_id uuid, title text, email text, subtitle text, at timestamp with time zone, acessos integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM (
    SELECT * FROM (
      SELECT DISTINCT ON (a.user_id)
        a.user_id::text AS key, a.user_id,
        COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text AS title,
        u.email::text AS email, a.current_route::text AS subtitle, a.last_seen_at AS at,
        GREATEST(1, (
          SELECT COUNT(*) FROM public.user_sessions s
          WHERE s.user_id = a.user_id
            AND s.started_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
            AND s.started_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        ))::int AS acessos
      FROM public.user_activity_log a
      LEFT JOIN public.profiles p ON p.id = a.user_id
      LEFT JOIN auth.users u ON u.id = a.user_id
      WHERE _tipo = 'online' AND public.is_admin_user(auth.uid())
        AND a.last_seen_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND a.last_seen_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND NOT public.is_admin_user(a.user_id)
      ORDER BY a.user_id, a.last_seen_at DESC
    ) o
    UNION ALL
    SELECT p.id::text, p.id,
      COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text,
      u.email::text, u.email::text, p.created_at, NULL::int
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE _tipo = 'cadastros' AND public.is_admin_user(auth.uid())
      AND p.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND p.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND NOT public.is_admin_user(p.id)
    UNION ALL
    SELECT s.id::text, s.user_id,
      COALESCE(p.display_name, split_part(u.email,'@',1), s.product_id, 'Assinatura')::text,
      u.email::text,
      (COALESCE(s.base_plan_id,'—') || ' · ' || replace(COALESCE(s.status::text,''),'SUBSCRIPTION_STATE_',''))::text,
      s.created_at, NULL::int
    FROM public.play_subscriptions s
    LEFT JOIN public.profiles p ON p.id = s.user_id
    LEFT JOIN auth.users u ON u.id = s.user_id
    WHERE _tipo = 'trial' AND public.is_admin_user(auth.uid())
      AND s.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND s.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND NOT public.is_admin_user(s.user_id)
  ) t
  ORDER BY t.at DESC
  LIMIT 500;
$$;
GRANT EXECUTE ON FUNCTION public.admin_lista_dia(text, date) TO authenticated;

-- 5. admin_totais
CREATE OR REPLACE FUNCTION public.admin_totais(_tipo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ids uuid[];
  res jsonb;
  hoje timestamptz := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF _tipo = 'online' OR _tipo = 'online5m' THEN
    SELECT array_agg(DISTINCT user_id) INTO ids FROM public.user_activity_log WHERE user_id IS NOT NULL AND NOT public.is_admin_user(user_id);
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (SELECT count(DISTINCT user_id) FROM public.user_activity_log WHERE last_seen_at >= hoje AND NOT public.is_admin_user(user_id)),
      'd7',   (SELECT count(DISTINCT user_id) FROM public.user_activity_log WHERE last_seen_at >= now() - interval '7 days' AND NOT public.is_admin_user(user_id)),
      'd30',  (SELECT count(DISTINCT user_id) FROM public.user_activity_log WHERE last_seen_at >= now() - interval '30 days' AND NOT public.is_admin_user(user_id))
    );
  ELSIF _tipo = 'trial' THEN
    SELECT array_agg(DISTINCT user_id) INTO ids FROM public.play_subscriptions WHERE user_id IS NOT NULL AND NOT public.is_admin_user(user_id);
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (SELECT count(DISTINCT user_id) FROM public.play_subscriptions WHERE created_at >= hoje AND NOT public.is_admin_user(user_id)),
      'd7',   (SELECT count(DISTINCT user_id) FROM public.play_subscriptions WHERE created_at >= now() - interval '7 days' AND NOT public.is_admin_user(user_id)),
      'd30',  (SELECT count(DISTINCT user_id) FROM public.play_subscriptions WHERE created_at >= now() - interval '30 days' AND NOT public.is_admin_user(user_id))
    );
  ELSE
    SELECT array_agg(id) INTO ids FROM auth.users WHERE NOT public.is_admin_user(id);
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (SELECT count(*) FROM auth.users WHERE created_at >= hoje AND NOT public.is_admin_user(id)),
      'd7',   (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '7 days' AND NOT public.is_admin_user(id)),
      'd30',  (SELECT count(*) FROM auth.users WHERE created_at >= now() - interval '30 days' AND NOT public.is_admin_user(id))
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
      'onboarding', (SELECT count(*) FROM public.profiles WHERE id = ANY(ids) AND desktop_onboarding_done_at IS NOT NULL),
      'paises', '[]'::jsonb
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_totais(text) TO authenticated;

-- 6. admin_user_auth_providers
CREATE OR REPLACE FUNCTION public.admin_user_auth_providers(_ids uuid[])
RETURNS TABLE(user_id uuid, email text, provider text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id,
         u.email::text,
         COALESCE(
           (SELECT i.provider FROM auth.identities i
             WHERE i.user_id = u.id AND i.provider <> 'email'
             ORDER BY i.created_at LIMIT 1),
           (u.raw_app_meta_data->>'provider'),
           'email'
         )::text
  FROM auth.users u
  WHERE u.id = ANY(_ids)
    AND public.is_admin_user(auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.admin_user_auth_providers(uuid[]) TO authenticated;

-- 7. admin_lista_provider
CREATE OR REPLACE FUNCTION public.admin_lista_provider(_tipo text, _provider text)
RETURNS TABLE(user_id uuid, email text, nome text, criado_em timestamptz, provider text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ids uuid[];
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RETURN;
  END IF;

  IF _tipo = 'online' OR _tipo = 'online5m' THEN
    SELECT array_agg(DISTINCT l.user_id) INTO ids FROM public.user_activity_log l WHERE l.user_id IS NOT NULL AND NOT public.is_admin_user(l.user_id);
  ELSIF _tipo = 'trial' THEN
    SELECT array_agg(DISTINCT s.user_id) INTO ids FROM public.play_subscriptions s WHERE s.user_id IS NOT NULL AND NOT public.is_admin_user(s.user_id);
  ELSE
    SELECT array_agg(u.id) INTO ids FROM auth.users u WHERE NOT public.is_admin_user(u.id);
  END IF;

  RETURN QUERY
  SELECT u.id,
         u.email::text,
         COALESCE(p.display_name, split_part(u.email::text, '@', 1))::text,
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
$$;
GRANT EXECUTE ON FUNCTION public.admin_lista_provider(text, text) TO authenticated;

-- 8. admin_user_geo
CREATE OR REPLACE FUNCTION public.admin_user_geo(_user_id uuid)
RETURNS TABLE(pais text, uf text, cidade text, timezone text, locale text, platform text, at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NULL::text AS pais, NULL::text AS uf, NULL::text AS cidade, NULL::text AS timezone, NULL::text AS locale, s.platform, s.created_at AS at
  FROM public.user_sessions s
  WHERE s.user_id = _user_id
    AND public.is_admin_user(auth.uid())
  ORDER BY s.created_at DESC
  LIMIT 20;
$$;
GRANT EXECUTE ON FUNCTION public.admin_user_geo(uuid) TO authenticated;
