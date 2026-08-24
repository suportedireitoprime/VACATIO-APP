CREATE TABLE IF NOT EXISTS public.desktop_link_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'consumed')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_hash text,
  action_link text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 minutes')
);

CREATE INDEX IF NOT EXISTS desktop_link_tokens_expires_at_idx
  ON public.desktop_link_tokens (expires_at);

GRANT ALL ON public.desktop_link_tokens TO service_role;

ALTER TABLE public.desktop_link_tokens ENABLE ROW LEVEL SECURITY;