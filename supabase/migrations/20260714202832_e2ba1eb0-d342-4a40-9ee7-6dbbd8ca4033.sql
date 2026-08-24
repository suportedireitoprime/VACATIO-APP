
-- 1) mentor_perfil
CREATE TABLE public.mentor_perfil (
  user_id uuid PRIMARY KEY,
  nome text,
  idade int,
  tipo_usuario text,
  area_foco text,
  nivel text,
  dores jsonb NOT NULL DEFAULT '[]'::jsonb,
  metas jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferencias jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_perfil TO authenticated;
GRANT ALL ON public.mentor_perfil TO service_role;
ALTER TABLE public.mentor_perfil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mentor_perfil" ON public.mentor_perfil FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_mentor_perfil_updated BEFORE UPDATE ON public.mentor_perfil
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) mentor_conversas
CREATE TABLE public.mentor_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_conversas_user ON public.mentor_conversas(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_conversas TO authenticated;
GRANT ALL ON public.mentor_conversas TO service_role;
ALTER TABLE public.mentor_conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mentor_conversas" ON public.mentor_conversas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_mentor_conversas_updated BEFORE UPDATE ON public.mentor_conversas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) mentor_mensagens
CREATE TABLE public.mentor_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.mentor_conversas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text,
  tool_calls jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_mensagens_conv ON public.mentor_mensagens(conversa_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_mensagens TO authenticated;
GRANT ALL ON public.mentor_mensagens TO service_role;
ALTER TABLE public.mentor_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mentor_mensagens" ON public.mentor_mensagens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) mentor_historico_resumo
CREATE TABLE public.mentor_historico_resumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resumo text NOT NULL,
  topicos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mentor_hist_user ON public.mentor_historico_resumo(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_historico_resumo TO authenticated;
GRANT ALL ON public.mentor_historico_resumo TO service_role;
ALTER TABLE public.mentor_historico_resumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mentor_historico_resumo" ON public.mentor_historico_resumo FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
