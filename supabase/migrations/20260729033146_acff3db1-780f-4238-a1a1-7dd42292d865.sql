ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invalid_reason text,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz;

CREATE INDEX IF NOT EXISTS device_tokens_user_valid_idx
  ON public.device_tokens (user_id) WHERE invalidated_at IS NULL;

CREATE OR REPLACE FUNCTION public.admin_push_status_usuario(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN NOT public.is_admin_user(auth.uid()) THEN NULL ELSE jsonb_build_object(
    'nome', (SELECT p.display_name FROM public.profiles p WHERE p.id = _user_id),
    'email', (SELECT u.email::text FROM auth.users u WHERE u.id = _user_id),
    'telefone', (
      SELECT h.phone_e164 FROM public.horus_whatsapp_users h
      WHERE h.user_id = _user_id OR h.linked_user_id = _user_id
      ORDER BY h.verified_at DESC NULLS LAST LIMIT 1
    ),
    'tokens', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'platform', d.platform,
        'created_at', d.created_at,
        'updated_at', d.updated_at,
        'last_success_at', d.last_success_at,
        'invalidated_at', d.invalidated_at,
        'invalid_reason', d.invalid_reason
      ) ORDER BY d.updated_at DESC)
      FROM public.device_tokens d WHERE d.user_id = _user_id
    ), '[]'::jsonb),
    'eventos', coalesce((
      SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
        SELECT jsonb_build_object(
          'event_type', e.event_type,
          'platform', e.platform,
          'created_at', e.created_at,
          'campaign_id', e.campaign_id,
          'titulo', (SELECT c.title FROM public.push_campaigns c WHERE c.id = e.campaign_id)
        ) AS x
        FROM public.push_events e
        WHERE e.user_id = _user_id
        ORDER BY e.created_at DESC
        LIMIT 30
      ) s
    ), '[]'::jsonb),
    'resumo', (
      SELECT jsonb_build_object(
        'sent', count(*) FILTER (WHERE event_type = 'sent'),
        'delivered', count(*) FILTER (WHERE event_type = 'delivered'),
        'opened', count(*) FILTER (WHERE event_type = 'opened'),
        'failed', count(*) FILTER (WHERE event_type = 'failed')
      ) FROM public.push_events WHERE user_id = _user_id
    )
  ) END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_push_status_usuario(uuid) TO authenticated;