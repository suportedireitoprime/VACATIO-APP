
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interesses text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS areas_interesse text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS whatsapp_number text;
