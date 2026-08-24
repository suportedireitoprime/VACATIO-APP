
-- horus_whatsapp_users
CREATE TABLE public.horus_whatsapp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  phone_e164 text NOT NULL UNIQUE,
  verified_at timestamptz,
  opt_in_leis boolean NOT NULL DEFAULT true,
  opt_in_blog boolean NOT NULL DEFAULT true,
  opt_in_lembretes boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  session_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horus_whatsapp_users TO authenticated;
GRANT ALL ON public.horus_whatsapp_users TO service_role;
ALTER TABLE public.horus_whatsapp_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own row" ON public.horus_whatsapp_users FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_horus_users_updated BEFORE UPDATE ON public.horus_whatsapp_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- horus_verification_codes
CREATE TABLE public.horus_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_e164 text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.horus_verification_codes (user_id, phone_e164);
GRANT ALL ON public.horus_verification_codes TO service_role;
ALTER TABLE public.horus_verification_codes ENABLE ROW LEVEL SECURITY;
-- no policies -> only service_role can read/write

-- horus_conversations
CREATE TABLE public.horus_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone_e164 text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text,
  media_url text,
  media_type text,
  tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.horus_conversations (user_id, created_at DESC);
CREATE INDEX ON public.horus_conversations (phone_e164, created_at DESC);
GRANT SELECT ON public.horus_conversations TO authenticated;
GRANT ALL ON public.horus_conversations TO service_role;
ALTER TABLE public.horus_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own convos" ON public.horus_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- horus_outbound_log
CREATE TABLE public.horus_outbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone_e164 text NOT NULL,
  kind text NOT NULL,
  campaign_id uuid,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.horus_outbound_log (user_id, created_at DESC);
GRANT SELECT ON public.horus_outbound_log TO authenticated;
GRANT ALL ON public.horus_outbound_log TO service_role;
ALTER TABLE public.horus_outbound_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own outbound" ON public.horus_outbound_log FOR SELECT
  USING (auth.uid() = user_id);
