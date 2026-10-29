-- Migração para incluir trials in-app (trial_reminders) nas métricas e listas do Admin,
-- garantindo que quando um usuário clicar em "Testar 3 dias gratuitos", ele apareça em "Iniciou teste".

-- 1. admin_metricas_dia
CREATE OR REPLACE FUNCTION public.admin_metricas_dia(_dia date)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.is_admin_user(auth.uid()) THEN jsonb_build_object(
    'online', (
      SELECT COUNT(DISTINCT a.user_id) 
      FROM public.user_activity_log a
      WHERE a.last_seen_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND a.last_seen_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND NOT public.is_admin_user(a.user_id)
    ),
    'cadastros', (
      SELECT COUNT(*) 
      FROM public.profiles p
      WHERE p.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND p.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND NOT public.is_admin_user(p.id)
    ),
    'trial', (
      SELECT COUNT(DISTINCT t.user_id)
      FROM (
        SELECT s.user_id, s.created_at
        FROM public.play_subscriptions s
        WHERE NOT public.is_admin_user(s.user_id)
        UNION ALL
        SELECT tr.user_id, COALESCE(tr.trial_started_at, tr.created_at) AS created_at
        FROM public.trial_reminders tr
        WHERE NOT public.is_admin_user(tr.user_id)
      ) t
      WHERE t.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND t.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
    )
  ) ELSE jsonb_build_object('online',0,'cadastros',0,'trial',0) END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_metricas_dia(date) TO authenticated;

-- 2. admin_lista_dia
DROP FUNCTION IF EXISTS public.admin_lista_dia(text, date);
CREATE OR REPLACE FUNCTION public.admin_lista_dia(_tipo text, _dia date)
RETURNS TABLE(
  key text, 
  user_id uuid, 
  title text, 
  email text, 
  subtitle text, 
  at timestamp with time zone, 
  acessos integer,
  avatar_url text,
  minutos_dia integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM (
    -- 1. Online
    SELECT * FROM (
      SELECT DISTINCT ON (a.user_id)
        a.user_id::text AS key, 
        a.user_id,
        COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text AS title,
        u.email::text AS email, 
        a.current_route::text AS subtitle, 
        a.last_seen_at AS at,
        GREATEST(1, COALESCE(a.acessos_hoje, (
          SELECT COUNT(*) FROM public.user_sessions s
          WHERE s.user_id = a.user_id
            AND s.started_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
            AND s.started_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        ), 1))::int AS acessos,
        COALESCE(p.avatar_url, (u.raw_user_meta_data->>'avatar_url'), (u.raw_user_meta_data->>'picture'))::text AS avatar_url,
        GREATEST(1, ROUND(COALESCE(a.segundos_hoje, 60)::numeric / 60))::int AS minutos_dia
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

    -- 2. Cadastros
    SELECT 
      p.id::text, 
      p.id,
      COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text,
      u.email::text, 
      u.email::text, 
      p.created_at, 
      NULL::int,
      COALESCE(p.avatar_url, (u.raw_user_meta_data->>'avatar_url'), (u.raw_user_meta_data->>'picture'))::text,
      NULL::int
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE _tipo = 'cadastros' AND public.is_admin_user(auth.uid())
      AND p.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND p.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND NOT public.is_admin_user(p.id)

    UNION ALL

    -- 3. Trial (play_subscriptions + trial_reminders)
    SELECT
      t.id::text, 
      t.user_id,
      COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text,
      u.email::text,
      t.sub_info::text,
      t.at_date, 
      NULL::int,
      COALESCE(p.avatar_url, (u.raw_user_meta_data->>'avatar_url'), (u.raw_user_meta_data->>'picture'))::text,
      NULL::int
    FROM (
      SELECT 
        s.id, 
        s.user_id, 
        s.created_at AS at_date,
        (COALESCE(s.base_plan_id, 'Google Play') || ' · ' || replace(COALESCE(s.status::text,''),'SUBSCRIPTION_STATE_','')) AS sub_info
      FROM public.play_subscriptions s
      WHERE NOT public.is_admin_user(s.user_id)

      UNION ALL

      SELECT 
        tr.id, 
        tr.user_id, 
        COALESCE(tr.trial_started_at, tr.created_at) AS at_date,
        ('Teste Grátis ' || tr.trial_days || ' dias (' || COALESCE(tr.plano, 'App') || ')') AS sub_info
      FROM public.trial_reminders tr
      WHERE NOT public.is_admin_user(tr.user_id)
    ) t
    LEFT JOIN public.profiles p ON p.id = t.user_id
    LEFT JOIN auth.users u ON u.id = t.user_id
    WHERE _tipo = 'trial' AND public.is_admin_user(auth.uid())
      AND t.at_date >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND t.at_date < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
  ) t
  ORDER BY t.at DESC
  LIMIT 500;
$$;
GRANT EXECUTE ON FUNCTION public.admin_lista_dia(text, date) TO authenticated;

-- 3. admin_totais
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
    SELECT array_agg(DISTINCT user_id) INTO ids FROM (
      SELECT user_id FROM public.play_subscriptions WHERE user_id IS NOT NULL AND NOT public.is_admin_user(user_id)
      UNION
      SELECT user_id FROM public.trial_reminders WHERE user_id IS NOT NULL AND NOT public.is_admin_user(user_id)
    ) all_trials;
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (
        SELECT count(DISTINCT user_id) FROM (
          SELECT user_id, created_at FROM public.play_subscriptions WHERE NOT public.is_admin_user(user_id)
          UNION ALL
          SELECT user_id, COALESCE(trial_started_at, created_at) AS created_at FROM public.trial_reminders WHERE NOT public.is_admin_user(user_id)
        ) x WHERE x.created_at >= hoje
      ),
      'd7', (
        SELECT count(DISTINCT user_id) FROM (
          SELECT user_id, created_at FROM public.play_subscriptions WHERE NOT public.is_admin_user(user_id)
          UNION ALL
          SELECT user_id, COALESCE(trial_started_at, created_at) AS created_at FROM public.trial_reminders WHERE NOT public.is_admin_user(user_id)
        ) x WHERE x.created_at >= now() - interval '7 days'
      ),
      'd30', (
        SELECT count(DISTINCT user_id) FROM (
          SELECT user_id, created_at FROM public.play_subscriptions WHERE NOT public.is_admin_user(user_id)
          UNION ALL
          SELECT user_id, COALESCE(trial_started_at, created_at) AS created_at FROM public.trial_reminders WHERE NOT public.is_admin_user(user_id)
        ) x WHERE x.created_at >= now() - interval '30 days'
      )
    );
  ELSIF _tipo = 'cadastros' THEN
    SELECT array_agg(id) INTO ids FROM public.profiles WHERE NOT public.is_admin_user(id);
    res := jsonb_build_object(
      'total', coalesce(array_length(ids,1),0),
      'hoje', (SELECT count(*) FROM public.profiles WHERE created_at >= hoje AND NOT public.is_admin_user(id)),
      'd7',   (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '7 days' AND NOT public.is_admin_user(id)),
      'd30',  (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days' AND NOT public.is_admin_user(id))
    );
  ELSE
    res := jsonb_build_object('total',0,'hoje',0,'d7',0,'d30',0);
  END IF;

  RETURN res;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_totais(text) TO authenticated;

-- 4. Gatilho de alerta para o Admin quando um usuário iniciar teste pelo app
CREATE OR REPLACE FUNCTION public.enfileirar_alerta_trial_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR public.is_admin_user(NEW.user_id) THEN 
    RETURN NEW; 
  END IF;

  INSERT INTO public.admin_alertas (tipo, user_id, payload)
  VALUES ('trial', NEW.user_id, jsonb_build_object(
    'origem', 'app_3_dias',
    'plano', COALESCE(NEW.plano, 'mensal'),
    'trial_days', NEW.trial_days,
    'started_at', COALESCE(NEW.trial_started_at, now())
  ))
  ON CONFLICT (tipo, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alerta_trial_reminders ON public.trial_reminders;
CREATE TRIGGER trg_alerta_trial_reminders
  AFTER INSERT ON public.trial_reminders
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_alerta_trial_app();
