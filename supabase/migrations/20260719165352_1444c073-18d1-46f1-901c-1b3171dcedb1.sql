ALTER TABLE public.locais_juridicos
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS user_ratings_total integer,
  ADD COLUMN IF NOT EXISTS editorial_summary text,
  ADD COLUMN IF NOT EXISTS google_maps_uri text,
  ADD COLUMN IF NOT EXISTS reviews jsonb;

UPDATE public.locais_juridicos
   SET photo_url = NULL,
       place_id = NULL,
       photo_attribution = NULL,
       photo_fetched_at = NULL,
       rating = NULL,
       user_ratings_total = NULL,
       editorial_summary = NULL,
       google_maps_uri = NULL,
       reviews = NULL
 WHERE nome IS NULL OR lower(nome) = 'sem nome';