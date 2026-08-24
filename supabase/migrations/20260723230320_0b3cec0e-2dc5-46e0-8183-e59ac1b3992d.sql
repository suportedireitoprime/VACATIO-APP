
CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(
    (auth.jwt() ->> 'email'),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  )) = ANY (ARRAY[
    'wn7corporation@gmail.com',
    'suporte.vacatio@gmail.com',
    'wn7juridico@gmail.com'
  ]);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_email() TO authenticated, anon;

DROP POLICY IF EXISTS "admins gerenciam sumario sugerido" ON public.aprender_sumario_sugerido;
CREATE POLICY "admins gerenciam sumario sugerido"
ON public.aprender_sumario_sugerido
FOR ALL
TO authenticated
USING (public.is_admin_email())
WITH CHECK (public.is_admin_email());

DROP POLICY IF EXISTS "Admins can read events" ON public.app_events;
CREATE POLICY "Admins can read events"
ON public.app_events
FOR SELECT
TO authenticated
USING (public.is_admin_email());
