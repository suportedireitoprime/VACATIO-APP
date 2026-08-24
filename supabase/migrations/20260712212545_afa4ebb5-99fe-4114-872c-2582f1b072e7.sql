-- RLS no bucket privado 'anotacoes-audio': arquivos vão pra pasta {user_id}/...
CREATE POLICY "Users read own audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'anotacoes-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anotacoes-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'anotacoes-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anotacoes-audio' AND (storage.foldername(name))[1] = auth.uid()::text);