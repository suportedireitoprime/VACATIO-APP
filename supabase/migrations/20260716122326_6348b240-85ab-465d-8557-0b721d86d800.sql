ALTER TABLE public.biblioteca_leitura_nativa
  ADD COLUMN IF NOT EXISTS etapa text,
  ADD COLUMN IF NOT EXISTS progresso integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_etapas integer NOT NULL DEFAULT 4;

-- Realtime para o cliente acompanhar
ALTER PUBLICATION supabase_realtime ADD TABLE public.biblioteca_leitura_nativa;