ALTER TABLE public.locais_juridicos
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS photo_attribution text,
  ADD COLUMN IF NOT EXISTS photo_fetched_at timestamptz;

CREATE INDEX IF NOT EXISTS locais_juridicos_place_id_idx ON public.locais_juridicos(place_id);