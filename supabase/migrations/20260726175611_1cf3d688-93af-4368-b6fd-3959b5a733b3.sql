CREATE OR REPLACE FUNCTION public.admin_user_auth_providers(_ids uuid[])
RETURNS TABLE(user_id uuid, email text, provider text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT u.id,
         u.email::text,
         COALESCE(
           (SELECT i.provider FROM auth.identities i
             WHERE i.user_id = u.id AND i.provider <> 'email'
             ORDER BY i.created_at LIMIT 1),
           (u.raw_app_meta_data->>'provider'),
           'email'
         )::text
  FROM auth.users u
  WHERE u.id = ANY(_ids)
    AND public.is_admin_user(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.admin_user_auth_providers(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_user_auth_providers(uuid[]) TO authenticated;
