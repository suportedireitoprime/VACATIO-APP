CREATE OR REPLACE FUNCTION public.admin_ai_usage_actors(_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id,
         COALESCE(p.display_name, split_part(u.email, '@', 1)) AS display_name,
         u.email::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = ANY(_user_ids)
    AND public.is_admin_user(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.admin_ai_usage_actors(uuid[]) TO authenticated;