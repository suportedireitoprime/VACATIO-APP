
-- Tabela de logs de processamento em tempo real
CREATE TABLE public.simulado_process_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id UUID REFERENCES public.simulados(id) ON DELETE CASCADE NOT NULL,
  etapa TEXT NOT NULL,
  detalhe TEXT,
  questao_numero INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.simulado_process_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública logs simulado" ON public.simulado_process_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_insert_logs_simulado" ON public.simulado_process_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_delete_logs_simulado" ON public.simulado_process_logs
  FOR DELETE TO service_role USING (true);

-- Adicionar coluna imagem_url na tabela simulado_questoes
ALTER TABLE public.simulado_questoes ADD COLUMN IF NOT EXISTS imagem_url TEXT;
