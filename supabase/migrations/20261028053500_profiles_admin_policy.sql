CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()));
