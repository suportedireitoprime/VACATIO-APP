
CREATE TABLE public.reminder_dispatch_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID,
  user_id UUID,
  livro_id TEXT,
  livro_titulo TEXT,
  canal TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reminder_dispatch_log TO authenticated;
GRANT ALL ON public.reminder_dispatch_log TO service_role;
ALTER TABLE public.reminder_dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem log" ON public.reminder_dispatch_log FOR SELECT TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE INDEX idx_rdl_created ON public.reminder_dispatch_log(created_at DESC);
CREATE INDEX idx_rdl_canal ON public.reminder_dispatch_log(canal);

CREATE OR REPLACE FUNCTION public.admin_lembretes_biblioteca_stats(_dias int DEFAULT 7)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH _guard AS (SELECT public.is_admin_user(auth.uid()) AS ok),
  base AS (
    SELECT * FROM public.reading_reminders
    WHERE (SELECT ok FROM _guard)
  ),
  disp AS (
    SELECT * FROM public.reminder_dispatch_log
    WHERE (SELECT ok FROM _guard)
      AND created_at > now() - (_dias || ' days')::interval
  )
  SELECT jsonb_build_object(
    'total_ativos', (SELECT COUNT(*) FROM base WHERE enabled = true),
    'total_lembretes', (SELECT COUNT(*) FROM base),
    'usuarios_unicos', (SELECT COUNT(DISTINCT user_id) FROM base),
    'com_livro', (SELECT COUNT(*) FROM base WHERE livro_id IS NOT NULL),
    'disparos_periodo', (SELECT COUNT(*) FROM disp),
    'disparos_24h', (SELECT COUNT(*) FROM public.reminder_dispatch_log WHERE created_at > now() - interval '24 hours'),
    'por_canal', COALESCE((
      SELECT jsonb_object_agg(canal, c) FROM (
        SELECT canal, COUNT(*) c FROM disp GROUP BY canal
      ) t
    ), '{}'::jsonb),
    'por_status', COALESCE((
      SELECT jsonb_object_agg(status, c) FROM (
        SELECT status, COUNT(*) c FROM disp GROUP BY status
      ) t
    ), '{}'::jsonb),
    'por_hora', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('hora', hora, 'total', c) ORDER BY hora) FROM (
        SELECT substring(time_of_day from 1 for 2)::int AS hora, COUNT(*) c
        FROM base WHERE enabled = true AND time_of_day IS NOT NULL GROUP BY 1
      ) t
    ), '[]'::jsonb),
    'por_dia_semana', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('dia', dia, 'total', c) ORDER BY dia) FROM (
        SELECT dia, COUNT(*) c FROM (
          SELECT unnest(days_of_week) AS dia FROM base WHERE enabled = true
        ) x GROUP BY dia
      ) t
    ), '[]'::jsonb),
    'por_estilo', COALESCE((
      SELECT jsonb_object_agg(COALESCE(message_style, 'padrao'), c) FROM (
        SELECT message_style, COUNT(*) c FROM base GROUP BY message_style
      ) t
    ), '{}'::jsonb)
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_lembretes_biblioteca_top_livros(_limit int DEFAULT 20)
RETURNS TABLE(livro_id text, livro_titulo text, livro_capa text, total bigint, usuarios bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    r.livro_id::text,
    MAX(r.livro_titulo) AS livro_titulo,
    MAX(r.livro_capa) AS livro_capa,
    COUNT(*)::bigint AS total,
    COUNT(DISTINCT r.user_id)::bigint AS usuarios
  FROM public.reading_reminders r
  WHERE public.is_admin_user(auth.uid())
    AND r.livro_id IS NOT NULL
  GROUP BY r.livro_id
  ORDER BY total DESC
  LIMIT greatest(_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.admin_lembretes_biblioteca_top_users(_limit int DEFAULT 20)
RETURNS TABLE(user_id uuid, display_name text, email text, total bigint, ativos bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    r.user_id,
    COALESCE(p.display_name, split_part(u.email::text,'@',1)) AS display_name,
    u.email::text,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE r.enabled)::bigint AS ativos
  FROM public.reading_reminders r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE public.is_admin_user(auth.uid())
  GROUP BY r.user_id, p.display_name, u.email
  ORDER BY total DESC
  LIMIT greatest(_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.admin_lembretes_biblioteca_recent(_limit int DEFAULT 50)
RETURNS TABLE(
  id uuid, created_at timestamptz, canal text, status text, error text,
  user_id uuid, display_name text, email text,
  livro_id text, livro_titulo text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.id, d.created_at, d.canal, d.status, d.error,
    d.user_id,
    COALESCE(p.display_name, split_part(u.email::text,'@',1)) AS display_name,
    u.email::text,
    d.livro_id, d.livro_titulo
  FROM public.reminder_dispatch_log d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  LEFT JOIN auth.users u ON u.id = d.user_id
  WHERE public.is_admin_user(auth.uid())
  ORDER BY d.created_at DESC
  LIMIT greatest(_limit, 1);
$$;
