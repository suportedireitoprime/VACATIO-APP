
CREATE POLICY "aulas_audio_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'aulas-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "aulas_audio_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aulas-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "aulas_audio_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'aulas-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "aulas_audio_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'aulas-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
