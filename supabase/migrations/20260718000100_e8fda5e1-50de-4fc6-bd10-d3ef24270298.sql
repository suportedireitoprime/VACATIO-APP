ALTER TABLE public.boletins_juridicos
ADD COLUMN IF NOT EXISTS youtube_video_id text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS thumbnail_url text;