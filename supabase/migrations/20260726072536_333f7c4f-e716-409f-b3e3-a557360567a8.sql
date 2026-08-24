
CREATE TABLE IF NOT EXISTS public.smart_link_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash text NOT NULL,
  target_path text NOT NULL,
  platform text NOT NULL DEFAULT 'ios',
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS smart_link_claims_fp_idx
  ON public.smart_link_claims (fingerprint_hash, created_at DESC);

GRANT ALL ON public.smart_link_claims TO service_role;

ALTER TABLE public.smart_link_claims ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy pra anon/authenticated: só service_role (edge function) acessa.
