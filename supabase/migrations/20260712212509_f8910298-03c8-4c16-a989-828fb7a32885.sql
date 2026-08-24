-- Adiciona suporte a anotações em áudio
ALTER TABLE public.artigos_anotacoes
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duration_ms integer,
  ADD COLUMN IF NOT EXISTS audio_transcript text;

-- Permite anotações onde a "anotacao" (texto) pode estar vazia,
-- desde que haja audio_url. Sem isso, a coluna NOT NULL bloqueia
-- gravações puramente de áudio.
ALTER TABLE public.artigos_anotacoes
  ALTER COLUMN anotacao DROP NOT NULL;

ALTER TABLE public.artigos_anotacoes
  ADD CONSTRAINT artigos_anotacoes_content_check
  CHECK (
    (anotacao IS NOT NULL AND length(btrim(anotacao)) > 0)
    OR audio_url IS NOT NULL
  );
