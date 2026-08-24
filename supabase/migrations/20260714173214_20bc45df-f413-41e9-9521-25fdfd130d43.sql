
CREATE POLICY "Public read narracoes" ON storage.objects
  FOR SELECT USING (bucket_id = 'narracoes');

CREATE POLICY "Service role write narracoes" ON storage.objects
  FOR INSERT TO service_role WITH CHECK (bucket_id = 'narracoes');

CREATE POLICY "Service role update narracoes" ON storage.objects
  FOR UPDATE TO service_role USING (bucket_id = 'narracoes');
