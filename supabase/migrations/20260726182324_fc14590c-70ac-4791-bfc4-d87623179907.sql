ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS locale text;

ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS locale text;

CREATE OR REPLACE FUNCTION public.admin_user_geo(_user_id uuid)
RETURNS TABLE(pais text, uf text, cidade text, timezone text, locale text, platform text, at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.pais, s.uf, s.cidade, s.timezone, s.locale, s.platform, s.created_at
  FROM public.user_sessions s
  WHERE s.user_id = _user_id
    AND public.is_admin_user(auth.uid())
  ORDER BY s.created_at DESC
  LIMIT 20;
$$;