ALTER TABLE public.apple_csr_storage 
  ADD COLUMN IF NOT EXISTS provisioning_profile_base64 TEXT,
  ADD COLUMN IF NOT EXISTS provisioning_profile_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.apple_csr_storage.provisioning_profile_base64 IS 'Base64 do arquivo .mobileprovision da Apple';
COMMENT ON COLUMN public.apple_csr_storage.provisioning_profile_updated_at IS 'Data/hora em que o provisioning profile foi salvo';