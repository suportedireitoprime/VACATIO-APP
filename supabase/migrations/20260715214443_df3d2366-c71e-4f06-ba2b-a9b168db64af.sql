ALTER TABLE public.narracoes_artigos
ADD COLUMN IF NOT EXISTS word_timings jsonb;

COMMENT ON COLUMN public.narracoes_artigos.word_timings IS 'Array of {word, start, end} in seconds for karaoke-style playback';