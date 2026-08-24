
ALTER TABLE public.audio_recordings
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS summary jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pronto',
  ADD COLUMN IF NOT EXISTS chunks_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'nota';
