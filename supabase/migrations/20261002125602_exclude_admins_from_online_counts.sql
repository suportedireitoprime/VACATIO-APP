-- Exclude admin users from online/metrics counts.
-- Admin emails: wn7corporation@gmail.com, suporte.vacatio@gmail.com
-- Previously they were filtered only in the frontend by display_name which was fragile.

-- ────────────────────────────────────────────────────────────────
-- 1. admin_metricas_dia — exclude admins from 'online' count
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_metricas_dia(_dia date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ────────────────────────────────────────────────────────────────
-- 2. admin_lista_dia — exclude admins from all listing types
-- ────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_lista_dia(text, date);

CREATE OR REPLACE FUNCTION public.admin_lista_dia(_tipo text, _dia date)
 RETURNS TABLE(key text, user_id uuid, title text, email text, subtitle text, at timestamp with time zone, acessos integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
