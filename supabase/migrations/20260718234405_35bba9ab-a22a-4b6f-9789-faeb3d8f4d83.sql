
ALTER TABLE public.concorrentes
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS nome_app text,
  ADD COLUMN IF NOT EXISTS desenvolvedor text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS total_avaliacoes_play integer,
  ADD COLUMN IF NOT EXISTS downloads_texto text,
  ADD COLUMN IF NOT EXISTS categoria_play text,
  ADD COLUMN IF NOT EXISTS job_status text,
  ADD COLUMN IF NOT EXISTS job_progresso jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS job_atualizado_em timestamptz;

ALTER TABLE public.concorrentes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'concorrentes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.concorrentes;
  END IF;
END $$;
