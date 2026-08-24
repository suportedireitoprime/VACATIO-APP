
-- Registrar a jornada (rotas) que o usuário percorre depois de abrir uma push
CREATE TABLE IF NOT EXISTS public.push_open_journey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.push_campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  install_id text,
  step int NOT NULL DEFAULT 0,
  route text NOT NULL,
  title text,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_open_journey_campaign_idx
  ON public.push_open_journey (campaign_id, user_id, at);
CREATE INDEX IF NOT EXISTS push_open_journey_install_idx
  ON public.push_open_journey (campaign_id, install_id, at);

GRANT SELECT, INSERT ON public.push_open_journey TO authenticated;
GRANT INSERT ON public.push_open_journey TO anon;
GRANT ALL ON public.push_open_journey TO service_role;

ALTER TABLE public.push_open_journey ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self can insert own journey" ON public.push_open_journey;
CREATE POLICY "self can insert own journey" ON public.push_open_journey
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "self reads own journey" ON public.push_open_journey;
CREATE POLICY "self reads own journey" ON public.push_open_journey
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin reads all journey" ON public.push_open_journey;
CREATE POLICY "admin reads all journey" ON public.push_open_journey
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- RPC admin para listar aberturas de hoje com nome e email juntos
CREATE OR REPLACE FUNCTION public.admin_list_opens_today()
RETURNS TABLE (
  event_id uuid,
  campaign_id uuid,
  campaign_title text,
  user_id uuid,
  display_name text,
  email text,
  platform text,
  install_id text,
  opened_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id                                                       AS event_id,
    e.campaign_id,
    c.title                                                    AS campaign_title,
    e.user_id,
    COALESCE(p.display_name, '—')                              AS display_name,
    u.email                                                    AS email,
    e.platform,
    NULLIF((e.metadata->>'install_id'), '')                    AS install_id,
    e.created_at                                               AS opened_at
  FROM public.push_events e
  LEFT JOIN public.push_campaigns c ON c.id = e.campaign_id
  LEFT JOIN public.profiles       p ON p.id = e.user_id
  LEFT JOIN auth.users            u ON u.id = e.user_id
  WHERE e.event_type = 'opened'
    AND e.created_at >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
      AT TIME ZONE 'America/Sao_Paulo'
    AND public.is_admin_user(auth.uid())
  ORDER BY e.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_opens_today() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_opens_today() TO authenticated;

-- RPC admin para pegar a jornada de uma abertura específica
CREATE OR REPLACE FUNCTION public.admin_get_open_journey(
  _campaign_id uuid,
  _user_id uuid,
  _install_id text
)
RETURNS TABLE (
  step int,
  route text,
  title text,
  at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.step, j.route, j.title, j.at
  FROM public.push_open_journey j
  WHERE j.campaign_id = _campaign_id
    AND public.is_admin_user(auth.uid())
    AND (
      (_user_id IS NOT NULL AND j.user_id = _user_id)
      OR (_user_id IS NULL AND _install_id IS NOT NULL AND j.install_id = _install_id)
    )
  ORDER BY j.at ASC
  LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.admin_get_open_journey(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_open_journey(uuid, uuid, text) TO authenticated;
