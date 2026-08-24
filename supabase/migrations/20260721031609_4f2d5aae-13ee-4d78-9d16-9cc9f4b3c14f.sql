ALTER TABLE public.audio_recordings
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'gravacao';
CREATE INDEX IF NOT EXISTS audio_recordings_tags_idx ON public.audio_recordings USING gin (tags);