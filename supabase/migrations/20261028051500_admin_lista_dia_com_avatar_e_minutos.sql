-- 1. Adiciona coluna avatar_url ao profiles (se não existir)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Popula avatar_url a partir do auth.users.raw_user_meta_data para usuários existentes
UPDATE public.profiles p
SET avatar_url = COALESCE(
  (u.raw_user_meta_data->>'avatar_url'),
  (u.raw_user_meta_data->>'picture')
)
FROM auth.users u
WHERE u.id = p.id
  AND p.avatar_url IS NULL
  AND (
    u.raw_user_meta_data->>'avatar_url' IS NOT NULL
    OR u.raw_user_meta_data->>'picture' IS NOT NULL
  );

-- 3. Trigger para manter avatar_url sincronizado ao fazer login
CREATE OR REPLACE FUNCTION public.sync_avatar_from_auth()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.profiles
  SET avatar_url = COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    avatar_url
  )
  WHERE id = NEW.id
    AND avatar_url IS DISTINCT FROM COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated_sync_avatar ON auth.users;
CREATE TRIGGER on_auth_user_updated_sync_avatar
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.sync_avatar_from_auth();

-- 4. Atualiza admin_lista_dia para incluir avatar_url e minutos_dia
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
    -- 1. Online (user_activity_log)
    SELECT * FROM (
      SELECT DISTINCT ON (a.user_id)
        a.user_id::text AS key,
        a.user_id,
        COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text AS title,
        u.email::text AS email,
        a.current_route::text AS subtitle,
        a.last_seen_at AS at,
        GREATEST(1, (
          SELECT COUNT(*) FROM public.user_sessions s
          WHERE s.user_id = a.user_id
            AND s.started_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
            AND s.started_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        ))::int AS acessos,
        COALESCE(
          p.avatar_url,
          (u.raw_user_meta_data->>'avatar_url'),
          (u.raw_user_meta_data->>'picture')
        )::text AS avatar_url,
        -- Minutos do dia: soma intervalos entre pings (cap 10min por gap)
        GREATEST(1, (
          SELECT COALESCE(
            SUM(
              LEAST(
                EXTRACT(EPOCH FROM (nxt - cur)) / 60.0,
                10.0
              )
            )::int,
            1
          )
          FROM (
            SELECT
              last_seen_at AS cur,
              LEAD(last_seen_at) OVER (ORDER BY last_seen_at) AS nxt
            FROM public.user_activity_log al2
            WHERE al2.user_id = a.user_id
              AND al2.last_seen_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
              AND al2.last_seen_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
          ) intervals
          WHERE nxt IS NOT NULL AND EXTRACT(EPOCH FROM (nxt - cur)) > 0
        ))::int AS minutos_dia
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

    -- 2. Cadastros (profiles)
    SELECT
      p.id::text, p.id,
      COALESCE(p.display_name, split_part(u.email,'@',1), 'Usuário')::text,
      u.email::text, u.email::text, p.created_at, NULL::int,
      COALESCE(p.avatar_url,(u.raw_user_meta_data->>'avatar_url'),(u.raw_user_meta_data->>'picture'))::text,
      NULL::int
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE _tipo = 'cadastros' AND public.is_admin_user(auth.uid())
      AND p.created_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND p.created_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND NOT public.is_admin_user(p.id)

    UNION ALL

    -- 3. Trial (play_subscriptions)
    SELECT
      s.id::text, s.user_id,
      COALESCE(p.display_name, split_part(u.email,'@',1), s.product_id, 'Assinatura')::text,
      u.email::text,
      (COALESCE(s.base_plan_id,'—') || ' · ' || replace(COALESCE(s.status::text,''),'SUBSCRIPTION_STATE_',''))::text,
      s.created_at, NULL::int,
      COALESCE(p.avatar_url,(u.raw_user_meta_data->>'avatar_url'),(u.raw_user_meta_data->>'picture'))::text,
      NULL::int
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
