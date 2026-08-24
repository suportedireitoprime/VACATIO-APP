CREATE POLICY "narracoes conteudo leitura admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'narracoes-conteudo' AND public.is_admin_user(auth.uid()));

CREATE POLICY "narracoes conteudo insere admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'narracoes-conteudo' AND public.is_admin_user(auth.uid()));

CREATE POLICY "narracoes conteudo atualiza admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'narracoes-conteudo' AND public.is_admin_user(auth.uid()));

CREATE POLICY "narracoes conteudo apaga admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'narracoes-conteudo' AND public.is_admin_user(auth.uid()));