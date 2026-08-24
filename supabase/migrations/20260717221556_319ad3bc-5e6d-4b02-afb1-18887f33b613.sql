-- Boletim tipos: qualquer um lê, admin escreve
CREATE POLICY "Boletim tipos leitura" ON storage.objects FOR SELECT
  USING (bucket_id = 'boletim-tipos');
CREATE POLICY "Boletim tipos escrita admin" ON storage.objects FOR ALL
  USING (bucket_id = 'boletim-tipos' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'boletim-tipos' AND public.is_admin_user(auth.uid()));

-- Boletins áudio: leitura pública (via signed URL não precisa policy; direta sim)
CREATE POLICY "Boletins audio leitura" ON storage.objects FOR SELECT
  USING (bucket_id = 'boletins-audio');
CREATE POLICY "Boletins audio escrita service" ON storage.objects FOR ALL
  USING (bucket_id = 'boletins-audio' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'boletins-audio' AND public.is_admin_user(auth.uid()));

-- Boletins vídeo: leitura pública
CREATE POLICY "Boletins video leitura" ON storage.objects FOR SELECT
  USING (bucket_id = 'boletins-video');
CREATE POLICY "Boletins video escrita admin" ON storage.objects FOR ALL
  USING (bucket_id = 'boletins-video' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'boletins-video' AND public.is_admin_user(auth.uid()));
