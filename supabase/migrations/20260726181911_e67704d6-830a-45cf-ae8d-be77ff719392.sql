CREATE OR REPLACE FUNCTION public.admin_metricas_dia(_dia date)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.is_admin_user(auth.uid()) THEN jsonb_build_object(
    'online', (SELECT COUNT(DISTINCT user_id) FROM public.user_activity_log WHERE last_seen_at >= _dia::timestamptz AND last_seen_at < (_dia + 1)::timestamptz),
    'cadastros', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= _dia::timestamptz AND created_at < (_dia + 1)::timestamptz),
    'trial', (SELECT COUNT(*) FROM public.play_subscriptions WHERE created_at >= _dia::timestamptz AND created_at < (_dia + 1)::timestamptz)
  ) ELSE jsonb_build_object('online',0,'cadastros',0,'trial',0) END;
$$;

CREATE OR REPLACE FUNCTION public.admin_lista_dia(_tipo text, _dia date)
RETURNS TABLE(key text, user_id uuid, title text, email text, subtitle text, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM (
    SELECT * FROM (
      SELECT DISTINCT ON (a.user_id)
        a.user_id::text AS key, a.user_id,
        COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text AS title,
        u.email::text AS email, a.current_route::text AS subtitle, a.last_seen_at AS at
      FROM public.user_activity_log a
      LEFT JOIN public.profiles p ON p.id = a.user_id
      LEFT JOIN auth.users u ON u.id = a.user_id
      WHERE _tipo = 'online' AND public.is_admin_user(auth.uid())
        AND a.last_seen_at >= _dia::timestamptz AND a.last_seen_at < (_dia + 1)::timestamptz
      ORDER BY a.user_id, a.last_seen_at DESC
    ) o
    UNION ALL
    SELECT p.id::text, p.id,
      COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text,
      u.email::text, u.email::text, p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE _tipo = 'cadastros' AND public.is_admin_user(auth.uid())
      AND p.created_at >= _dia::timestamptz AND p.created_at < (_dia + 1)::timestamptz
    UNION ALL
    SELECT s.id::text, s.user_id,
      COALESCE(p.display_name, split_part(u.email,'@',1), s.product_id, 'Assinatura')::text,
      u.email::text,
      (COALESCE(s.base_plan_id,'—') || ' · ' || replace(COALESCE(s.status::text,''),'SUBSCRIPTION_STATE_',''))::text,
      s.created_at
    FROM public.play_subscriptions s
    LEFT JOIN public.profiles p ON p.id = s.user_id
    LEFT JOIN auth.users u ON u.id = s.user_id
    WHERE _tipo = 'trial' AND public.is_admin_user(auth.uid())
      AND s.created_at >= _dia::timestamptz AND s.created_at < (_dia + 1)::timestamptz
  ) t
  ORDER BY t.at DESC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.admin_metricas_dia(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lista_dia(text, date) TO authenticated;