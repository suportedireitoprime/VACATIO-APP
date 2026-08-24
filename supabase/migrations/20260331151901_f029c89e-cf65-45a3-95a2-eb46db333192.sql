
-- Tabela de provas/simulados
CREATE TABLE public.simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  tipo_prova TEXT,
  banca TEXT,
  ano INTEGER,
  orgao TEXT,
  total_questoes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  erro_detalhe TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_simulados" ON public.simulados
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "owner_insert_simulados" ON public.simulados
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_delete_simulados" ON public.simulados
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "owner_update_simulados" ON public.simulados
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "service_all_simulados" ON public.simulados
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tabela de questões
CREATE TABLE public.simulado_questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id UUID REFERENCES public.simulados(id) ON DELETE CASCADE NOT NULL,
  numero INTEGER NOT NULL,
  enunciado TEXT NOT NULL,
  alternativa_a TEXT,
  alternativa_b TEXT,
  alternativa_c TEXT,
  alternativa_d TEXT,
  alternativa_e TEXT,
  gabarito TEXT NOT NULL,
  materia TEXT,
  ordem INTEGER DEFAULT 0
);

ALTER TABLE public.simulado_questoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_questoes" ON public.simulado_questoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_all_questoes" ON public.simulado_questoes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
