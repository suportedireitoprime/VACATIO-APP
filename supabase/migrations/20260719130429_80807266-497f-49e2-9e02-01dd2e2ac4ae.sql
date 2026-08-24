
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('text','image','tts','stt','embedding')),
  model text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'auto' CHECK (trigger_type IN ('manual','auto')),
  input_units integer NOT NULL DEFAULT 0,
  output_units integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  duration_ms integer,
  success boolean NOT NULL DEFAULT true,
  error text,
  user_id uuid,
  ref_id text
);

CREATE INDEX ai_usage_log_fn_created_idx ON public.ai_usage_log (function_name, created_at DESC);
CREATE INDEX ai_usage_log_kind_created_idx ON public.ai_usage_log (kind, created_at DESC);
CREATE INDEX ai_usage_log_created_idx ON public.ai_usage_log (created_at DESC);

GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ai usage log"
  ON public.ai_usage_log FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));
