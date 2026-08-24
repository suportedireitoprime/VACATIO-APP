
-- ==== ÁREAS =========================================================
CREATE TABLE public.aprender_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  ordem int NOT NULL DEFAULT 0,
  cor text,
  icone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aprender_areas TO authenticated;
GRANT ALL ON public.aprender_areas TO service_role;
ALTER TABLE public.aprender_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Areas visíveis para autenticados"
  ON public.aprender_areas FOR SELECT TO authenticated USING (true);

-- ==== MÓDULOS =======================================================
CREATE TABLE public.aprender_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.aprender_areas(id) ON DELETE CASCADE,
  slug text NOT NULL,
  titulo text NOT NULL,
  resumo text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (area_id, slug)
);
GRANT SELECT ON public.aprender_modulos TO authenticated;
GRANT ALL ON public.aprender_modulos TO service_role;
ALTER TABLE public.aprender_modulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modulos visíveis para autenticados"
  ON public.aprender_modulos FOR SELECT TO authenticated USING (true);
CREATE INDEX aprender_modulos_area_idx ON public.aprender_modulos(area_id, ordem);

-- ==== AULAS =========================================================
CREATE TABLE public.aprender_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id uuid NOT NULL REFERENCES public.aprender_modulos(id) ON DELETE CASCADE,
  slug text NOT NULL,
  titulo text NOT NULL,
  objetivo text,
  duracao_est_min int NOT NULL DEFAULT 8,
  ordem int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  resumo_origem_id uuid REFERENCES public.resumos_juridicos(id) ON DELETE SET NULL,
  modelo_ia text,
  gerada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modulo_id, slug)
);
GRANT SELECT ON public.aprender_aulas TO authenticated;
GRANT ALL ON public.aprender_aulas TO service_role;
ALTER TABLE public.aprender_aulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aulas publicadas visíveis para autenticados"
  ON public.aprender_aulas FOR SELECT TO authenticated
  USING (status = 'published');
CREATE INDEX aprender_aulas_modulo_idx ON public.aprender_aulas(modulo_id, ordem);
CREATE INDEX aprender_aulas_resumo_idx ON public.aprender_aulas(resumo_origem_id);

-- ==== BLOCOS ========================================================
CREATE TABLE public.aprender_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.aprender_aulas(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('intro','leitura','conceito','pergunta','exemplo','conexao','flashcard','conclusao')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resposta_correta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.aprender_blocos TO authenticated;
GRANT ALL ON public.aprender_blocos TO service_role;
ALTER TABLE public.aprender_blocos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Blocos de aulas publicadas visíveis para autenticados"
  ON public.aprender_blocos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.aprender_aulas a
    WHERE a.id = aprender_blocos.aula_id AND a.status = 'published'
  ));
CREATE INDEX aprender_blocos_aula_idx ON public.aprender_blocos(aula_id, ordem);

-- ==== PROGRESSO DE AULA ============================================
CREATE TABLE public.aprender_progresso_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aula_id uuid NOT NULL REFERENCES public.aprender_aulas(id) ON DELETE CASCADE,
  blocos_concluidos int NOT NULL DEFAULT 0,
  acertos int NOT NULL DEFAULT 0,
  total_perguntas int NOT NULL DEFAULT 0,
  tempo_ms bigint NOT NULL DEFAULT 0,
  concluida_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, aula_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprender_progresso_aula TO authenticated;
GRANT ALL ON public.aprender_progresso_aula TO service_role;
ALTER TABLE public.aprender_progresso_aula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno gerencia próprio progresso de aula"
  ON public.aprender_progresso_aula FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX aprender_progresso_aula_user_idx ON public.aprender_progresso_aula(user_id);

-- ==== PROGRESSO DE BLOCO ============================================
CREATE TABLE public.aprender_progresso_bloco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bloco_id uuid NOT NULL REFERENCES public.aprender_blocos(id) ON DELETE CASCADE,
  resposta jsonb,
  acertou boolean,
  tentativas int NOT NULL DEFAULT 0,
  proxima_revisao_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bloco_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprender_progresso_bloco TO authenticated;
GRANT ALL ON public.aprender_progresso_bloco TO service_role;
ALTER TABLE public.aprender_progresso_bloco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno gerencia próprio progresso de bloco"
  ON public.aprender_progresso_bloco FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX aprender_progresso_bloco_user_idx ON public.aprender_progresso_bloco(user_id);

-- ==== DOMÍNIO POR ÁREA ==============================================
CREATE TABLE public.aprender_dominio_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.aprender_areas(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprender_dominio_area TO authenticated;
GRANT ALL ON public.aprender_dominio_area TO service_role;
ALTER TABLE public.aprender_dominio_area ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno vê próprio domínio"
  ON public.aprender_dominio_area FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==== Triggers updated_at ==========================================
CREATE TRIGGER aprender_areas_updated BEFORE UPDATE ON public.aprender_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER aprender_modulos_updated BEFORE UPDATE ON public.aprender_modulos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER aprender_aulas_updated BEFORE UPDATE ON public.aprender_aulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
