
CREATE TABLE public.apple_csr_storage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  common_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  key_pem TEXT NOT NULL,
  csr_pem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apple_csr_storage TO authenticated;
GRANT ALL ON public.apple_csr_storage TO service_role;
ALTER TABLE public.apple_csr_storage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own apple csr"
ON public.apple_csr_storage FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
