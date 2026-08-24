
-- RLS: bucket mobile-config só acessível via service_role (edge functions).
-- A UI usa a edge function `mobile-config-upload` que valida admin antes de escrever.

CREATE POLICY "mobile_config_service_role_all"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'mobile-config')
WITH CHECK (bucket_id = 'mobile-config');
