ALTER TABLE public.apple_csr_storage
  ADD COLUMN IF NOT EXISTS app_store_connect_issuer_id TEXT,
  ADD COLUMN IF NOT EXISTS app_store_connect_key_id TEXT,
  ADD COLUMN IF NOT EXISTS app_store_connect_p8_base64 TEXT;

CREATE OR REPLACE FUNCTION public.update_apple_csr_storage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_apple_csr_storage_updated_at'
      AND tgrelid = 'public.apple_csr_storage'::regclass
  ) THEN
    CREATE TRIGGER update_apple_csr_storage_updated_at
    BEFORE UPDATE ON public.apple_csr_storage
    FOR EACH ROW EXECUTE FUNCTION public.update_apple_csr_storage_updated_at();
  END IF;
END
$$;