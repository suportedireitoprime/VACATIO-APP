
-- Colunas de refino e progresso na tabela de leitura nativa
ALTER TABLE public.biblioteca_leitura_nativa
  ADD COLUMN IF NOT EXISTS etapa text,
  ADD COLUMN IF NOT EXISTS progresso integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_etapas integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS conteudo_md_refinado text,
  ADD COLUMN IF NOT EXISTS capitulos_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preliminares_md text,
  ADD COLUMN IF NOT EXISTS refino_status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS refino_erro text,
  ADD COLUMN IF NOT EXISTS refino_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS refino_modelo text;

-- Fila de jobs de leitura nativa
CREATE TABLE IF NOT EXISTS public.biblioteca_leitura_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_tabela text NOT NULL,
  livro_id text NOT NULL,
  pdf_url text,
  titulo text,
  tipo text NOT NULL DEFAULT 'completo', -- ocr | refino | completo
  prioridade int NOT NULL DEFAULT 100,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'agendado', -- agendado | rodando | ok | erro | cancelado
  tentativas int NOT NULL DEFAULT 0,
  erro text,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.biblioteca_leitura_jobs TO authenticated;
GRANT ALL ON public.biblioteca_leitura_jobs TO service_role;

ALTER TABLE public.biblioteca_leitura_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem jobs de leitura"
  ON public.biblioteca_leitura_jobs
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins criam jobs de leitura"
  ON public.biblioteca_leitura_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins atualizam jobs de leitura"
  ON public.biblioteca_leitura_jobs
  FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER update_biblioteca_leitura_jobs_updated_at
  BEFORE UPDATE ON public.biblioteca_leitura_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_biblioteca_leitura_jobs_fila
  ON public.biblioteca_leitura_jobs (status, scheduled_for, prioridade);

CREATE INDEX IF NOT EXISTS idx_biblioteca_leitura_jobs_livro
  ON public.biblioteca_leitura_jobs (livro_tabela, livro_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.biblioteca_leitura_jobs;
