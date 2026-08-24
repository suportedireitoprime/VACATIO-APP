ALTER TABLE public.horus_whatsapp_users
  ADD COLUMN IF NOT EXISTS onboarding_state text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_onboarding_msg_at timestamptz;

UPDATE public.horus_whatsapp_users
  SET onboarding_state = CASE
    WHEN verified_at IS NOT NULL THEN 'verified'
    ELSE 'unknown'
  END
  WHERE onboarding_state NOT IN ('unknown','code_sent','verified');

UPDATE public.horus_whatsapp_users
  SET onboarding_state = 'verified'
  WHERE verified_at IS NOT NULL AND onboarding_state <> 'verified';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'horus_whatsapp_users_onboarding_state_chk'
  ) THEN
    ALTER TABLE public.horus_whatsapp_users
      ADD CONSTRAINT horus_whatsapp_users_onboarding_state_chk
      CHECK (onboarding_state IN ('unknown','code_sent','verified'));
  END IF;
END $$;