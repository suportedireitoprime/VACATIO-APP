-- 1. Colunas em user_sessions
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS locale text;

-- 2. Colunas em user_activity_log para acumulo de tempo e acessos
ALTER TABLE public.user_activity_log
  ADD COLUMN IF NOT EXISTS segundos_hoje integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS acessos_hoje integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS data_hoje date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  ADD COLUMN IF NOT EXISTS primeiro_acesso_hoje timestamptz NOT NULL DEFAULT now();

-- 3. Tabela historica diária por usuário
CREATE TABLE IF NOT EXISTS public.user_daily_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  dia date NOT NULL,
  minutos integer NOT NULL DEFAULT 1,
  acessos integer NOT NULL DEFAULT 1,
  current_route text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_daily UNIQUE(user_id, dia)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_activity_dia ON public.user_daily_activity(dia DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user ON public.user_daily_activity(user_id);
GRANT SELECT, INSERT, UPDATE ON public.user_daily_activity TO authenticated, service_role;
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read user_daily_activity" ON public.user_daily_activity;
CREATE POLICY "Admins read user_daily_activity"
  ON public.user_daily_activity FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Users can upsert own daily activity" ON public.user_daily_activity;
CREATE POLICY "Users can upsert own daily activity"
  ON public.user_daily_activity FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Trigger atualizada em user_activity_log para calcular tempo real de tela e contagem de acessos
CREATE OR REPLACE FUNCTION public.trg_user_activity_log_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_hoje date;
  v_diff_sec numeric;
  v_minutos int;
BEGIN
  v_hoje := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  
  IF TG_OP = 'INSERT' THEN
    NEW.last_seen_at := now();
    NEW.data_hoje := v_hoje;
    NEW.segundos_hoje := 60;
    NEW.acessos_hoje := 1;
    NEW.primeiro_acesso_hoje := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.data_hoje IS DISTINCT FROM v_hoje THEN
      NEW.data_hoje := v_hoje;
      NEW.segundos_hoje := 60;
      NEW.acessos_hoje := 1;
      NEW.primeiro_acesso_hoje := now();
    ELSE
      v_diff_sec := EXTRACT(EPOCH FROM (now() - OLD.last_seen_at));
      IF v_diff_sec >= 0 AND v_diff_sec <= 180 THEN
        NEW.segundos_hoje := COALESCE(OLD.segundos_hoje, 0) + GREATEST(1, v_diff_sec::int);
        NEW.acessos_hoje := GREATEST(1, COALESCE(OLD.acessos_hoje, 1));
      ELSIF v_diff_sec > 180 THEN
        -- Nova sessão após mais de 3 minutos de inatividade
        NEW.segundos_hoje := COALESCE(OLD.segundos_hoje, 0) + 60;
        NEW.acessos_hoje := GREATEST(1, COALESCE(OLD.acessos_hoje, 1)) + 1;
      END IF;
    END IF;
    NEW.last_seen_at := now();
  END IF;

  -- Sincroniza com user_daily_activity
  v_minutos := GREATEST(1, ROUND(NEW.segundos_hoje / 60.0)::int);
  INSERT INTO public.user_daily_activity (user_id, dia, minutos, acessos, current_route, last_seen_at)
  VALUES (
    NEW.user_id,
    NEW.data_hoje,
    v_minutos,
    NEW.acessos_hoje,
    NEW.current_route,
    NEW.last_seen_at
  )
  ON CONFLICT (user_id, dia) DO UPDATE
    SET minutos = EXCLUDED.minutos,
        acessos = EXCLUDED.acessos,
        current_route = EXCLUDED.current_route,
        last_seen_at = EXCLUDED.last_seen_at;

  RETURN NEW;
END;
$function$;

-- 5. Atualiza admin_lista_dia para usar os minutos reais e incluir o admin
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
        COALESCE(uda.current_route, a.current_route)::text AS subtitle,
        COALESCE(uda.last_seen_at, a.last_seen_at) AS at,
        COALESCE(
          uda.acessos,
          (
            SELECT COUNT(*) FROM public.user_sessions s
            WHERE s.user_id = a.user_id
              AND s.started_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
              AND s.started_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
          ),
          a.acessos_hoje,
          1
        )::int AS acessos,
        COALESCE(
          p.avatar_url,
          (u.raw_user_meta_data->>'avatar_url'),
          (u.raw_user_meta_data->>'picture')
        )::text AS avatar_url,
        COALESCE(
          uda.minutos,
          CASE 
            WHEN a.data_hoje = _dia THEN GREATEST(1, ROUND(a.segundos_hoje / 60.0)::int)
            ELSE 1
          END
        )::int AS minutos_dia
      FROM public.user_activity_log a
      LEFT JOIN public.user_daily_activity uda ON uda.user_id = a.user_id AND uda.dia = _dia
      LEFT JOIN public.profiles p ON p.id = a.user_id
      LEFT JOIN auth.users u ON u.id = a.user_id
      WHERE _tipo = 'online' AND public.is_admin_user(auth.uid())
        AND (
          (uda.id IS NOT NULL)
          OR (
            a.last_seen_at >= (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo')
            AND a.last_seen_at < ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
          )
        )
      ORDER BY a.user_id, COALESCE(uda.last_seen_at, a.last_seen_at) DESC
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
  ) t
  ORDER BY t.at DESC
  LIMIT 500;
$$;
GRANT EXECUTE ON FUNCTION public.admin_lista_dia(text, date) TO authenticated;
