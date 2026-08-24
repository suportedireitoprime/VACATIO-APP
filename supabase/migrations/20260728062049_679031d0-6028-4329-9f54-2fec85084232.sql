-- 1. user_activity_log: leitura restrita ao próprio usuário ou admin
DROP POLICY IF EXISTS "Authenticated read activity" ON public.user_activity_log;
CREATE POLICY "Own or admin read activity"
  ON public.user_activity_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- 2. search_hits: remove leitura pública
DROP POLICY IF EXISTS "search_hits select público" ON public.search_hits;
CREATE POLICY "search_hits admin select"
  ON public.search_hits FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 3. Tabelas internas: sem acesso via Data API (apenas service_role)
REVOKE ALL ON public.desktop_link_tokens FROM anon, authenticated;
REVOKE ALL ON public.horus_qr_cache FROM anon, authenticated;
REVOKE ALL ON public.horus_verification_codes FROM anon, authenticated;
REVOKE ALL ON public.smart_link_claims FROM anon, authenticated;
GRANT ALL ON public.desktop_link_tokens TO service_role;
GRANT ALL ON public.horus_qr_cache TO service_role;
GRANT ALL ON public.horus_verification_codes TO service_role;
GRANT ALL ON public.smart_link_claims TO service_role;