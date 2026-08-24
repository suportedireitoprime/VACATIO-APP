
-- =================== Locais Jurídicos v2 ===================

-- Check-ins
CREATE TABLE public.locais_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_id uuid NOT NULL REFERENCES public.locais_juridicos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_locais_checkins_local ON public.locais_checkins(local_id);
CREATE INDEX idx_locais_checkins_user ON public.locais_checkins(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.locais_checkins TO authenticated;
GRANT ALL ON public.locais_checkins TO service_role;
ALTER TABLE public.locais_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_select_all_authenticated" ON public.locais_checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "checkins_insert_self" ON public.locais_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkins_delete_self" ON public.locais_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Avaliações
CREATE TABLE public.locais_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_id uuid NOT NULL REFERENCES public.locais_juridicos(id) ON DELETE CASCADE,
  nota smallint NOT NULL CHECK (nota BETWEEN 1 AND 5),
  tags text[] NOT NULL DEFAULT '{}',
  comentario text,
  moderado_em timestamptz,
  aprovado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_id)
);
CREATE INDEX idx_locais_avaliacoes_local ON public.locais_avaliacoes(local_id) WHERE aprovado = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locais_avaliacoes TO authenticated;
GRANT SELECT ON public.locais_avaliacoes TO anon;
GRANT ALL ON public.locais_avaliacoes TO service_role;
ALTER TABLE public.locais_avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aval_select_public" ON public.locais_avaliacoes FOR SELECT USING (aprovado = true OR auth.uid() = user_id);
CREATE POLICY "aval_insert_self" ON public.locais_avaliacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aval_update_self" ON public.locais_avaliacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aval_delete_self" ON public.locais_avaliacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_locais_aval_updated BEFORE UPDATE ON public.locais_avaliacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fotos de usuário
CREATE TABLE public.locais_fotos_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_id uuid NOT NULL REFERENCES public.locais_juridicos(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  aprovada boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_locais_fotos_usuario_local ON public.locais_fotos_usuario(local_id) WHERE aprovada = true;
GRANT SELECT, INSERT, DELETE ON public.locais_fotos_usuario TO authenticated;
GRANT SELECT ON public.locais_fotos_usuario TO anon;
GRANT ALL ON public.locais_fotos_usuario TO service_role;
ALTER TABLE public.locais_fotos_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fotos_select_public" ON public.locais_fotos_usuario FOR SELECT USING (aprovada = true OR auth.uid() = user_id);
CREATE POLICY "fotos_insert_self" ON public.locais_fotos_usuario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fotos_delete_self" ON public.locais_fotos_usuario FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Selos
CREATE TABLE public.locais_selos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  codigo text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(user_id, codigo)
);
GRANT SELECT, INSERT ON public.locais_selos TO authenticated;
GRANT ALL ON public.locais_selos TO service_role;
ALTER TABLE public.locais_selos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "selos_select_self" ON public.locais_selos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "selos_insert_service" ON public.locais_selos FOR INSERT TO service_role WITH CHECK (true);

-- Trilhas
CREATE TABLE public.locais_trilhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  descricao text,
  cover_url text,
  local_ids uuid[] NOT NULL DEFAULT '{}',
  selo_codigo text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locais_trilhas TO anon, authenticated;
GRANT ALL ON public.locais_trilhas TO service_role;
ALTER TABLE public.locais_trilhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trilhas_select_public" ON public.locais_trilhas FOR SELECT USING (ativa = true);
CREATE TRIGGER trg_locais_trilhas_updated BEFORE UPDATE ON public.locais_trilhas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.locais_trilhas_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trilha_id uuid NOT NULL REFERENCES public.locais_trilhas(id) ON DELETE CASCADE,
  local_ids_visitados uuid[] NOT NULL DEFAULT '{}',
  concluida_em timestamptz,
  certificado_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, trilha_id)
);
GRANT SELECT, INSERT, UPDATE ON public.locais_trilhas_progresso TO authenticated;
GRANT ALL ON public.locais_trilhas_progresso TO service_role;
ALTER TABLE public.locais_trilhas_progresso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trilhas_prog_self" ON public.locais_trilhas_progresso FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_trilhas_prog_updated BEFORE UPDATE ON public.locais_trilhas_progresso FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Favoritos server-side (sincronizar com localStorage)
CREATE TABLE public.locais_favoritos (
  user_id uuid NOT NULL,
  local_id uuid NOT NULL REFERENCES public.locais_juridicos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, local_id)
);
GRANT SELECT, INSERT, DELETE ON public.locais_favoritos TO authenticated;
GRANT ALL ON public.locais_favoritos TO service_role;
ALTER TABLE public.locais_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fav_self" ON public.locais_favoritos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage policies para bucket locais-fotos-user
CREATE POLICY "user_fotos_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'locais-fotos-user');
CREATE POLICY "user_fotos_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'locais-fotos-user' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user_fotos_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'locais-fotos-user' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Função agregadora de estatísticas do local
CREATE OR REPLACE FUNCTION public.local_estatisticas(_local_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'checkins', (SELECT COUNT(*) FROM public.locais_checkins WHERE local_id = _local_id),
    'ultima_visita', (SELECT MAX(created_at) FROM public.locais_checkins WHERE local_id = _local_id),
    'avaliacao_media', COALESCE((SELECT ROUND(AVG(nota)::numeric, 1) FROM public.locais_avaliacoes WHERE local_id = _local_id AND aprovado = true), 0),
    'avaliacao_total', (SELECT COUNT(*) FROM public.locais_avaliacoes WHERE local_id = _local_id AND aprovado = true),
    'fotos_usuario', (SELECT COUNT(*) FROM public.locais_fotos_usuario WHERE local_id = _local_id AND aprovada = true)
  );
$$;

-- Cache de horário de funcionamento (para "Aberto agora")
ALTER TABLE public.locais_juridicos ADD COLUMN IF NOT EXISTS horario_places jsonb;
ALTER TABLE public.locais_juridicos ADD COLUMN IF NOT EXISTS place_id text;
