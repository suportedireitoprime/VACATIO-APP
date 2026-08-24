
-- 1) Premium flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- 2) Push campaigns
CREATE TABLE IF NOT EXISTS public.push_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text,
  icon text,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at timestamptz,
  recurrence jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  opened_count int NOT NULL DEFAULT 0,
  converted_count int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_campaigns_status_next ON public.push_campaigns (status, next_run_at);
CREATE INDEX IF NOT EXISTS push_campaigns_created ON public.push_campaigns (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_campaigns TO authenticated;
GRANT ALL ON public.push_campaigns TO service_role;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin manages push campaigns" ON public.push_campaigns;
CREATE POLICY "admin manages push campaigns" ON public.push_campaigns
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'wn7corporation@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'wn7corporation@gmail.com');

DROP TRIGGER IF EXISTS push_campaigns_updated_at ON public.push_campaigns;
CREATE TRIGGER push_campaigns_updated_at
  BEFORE UPDATE ON public.push_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Push events
CREATE TABLE IF NOT EXISTS public.push_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.push_campaigns(id) ON DELETE CASCADE,
  token text,
  user_id uuid,
  platform text,
  event_type text NOT NULL,
  error text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_events_campaign ON public.push_events (campaign_id, event_type);
CREATE INDEX IF NOT EXISTS push_events_created ON public.push_events (created_at DESC);
GRANT SELECT ON public.push_events TO authenticated;
GRANT ALL ON public.push_events TO service_role;
ALTER TABLE public.push_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads push events" ON public.push_events;
CREATE POLICY "admin reads push events" ON public.push_events
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'wn7corporation@gmail.com');

-- 4) device_tokens index
CREATE INDEX IF NOT EXISTS device_tokens_platform_user ON public.device_tokens (platform, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_token_unique ON public.device_tokens (token);
