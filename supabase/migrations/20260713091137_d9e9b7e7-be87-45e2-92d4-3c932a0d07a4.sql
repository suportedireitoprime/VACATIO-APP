
-- user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  theme_id text,
  highlights jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- premium_usage
CREATE TABLE IF NOT EXISTS public.premium_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  ref_key text,
  used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_premium_usage_user_feature ON public.premium_usage(user_id, feature, used_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_usage TO authenticated;
GRANT ALL ON public.premium_usage TO service_role;
ALTER TABLE public.premium_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own usage" ON public.premium_usage FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_activity_log
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  display_name text,
  current_route text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_last_seen ON public.user_activity_log(last_seen_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity_log TO authenticated;
GRANT ALL ON public.user_activity_log TO service_role;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users upsert own activity" ON public.user_activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated read activity" ON public.user_activity_log FOR SELECT TO authenticated USING (true);

-- study_sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  mode text NOT NULL,
  total integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- mensagens_suporte
CREATE TABLE IF NOT EXISTS public.mensagens_suporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  assunto text NOT NULL,
  mensagem text NOT NULL,
  respondido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_suporte TO authenticated;
GRANT ALL ON public.mensagens_suporte TO service_role;
ALTER TABLE public.mensagens_suporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own message" ON public.mensagens_suporte FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own message" ON public.mensagens_suporte FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- kanban_proposicoes
CREATE TABLE IF NOT EXISTS public.kanban_proposicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sigla_tipo text,
  numero text,
  ano integer,
  ementa text,
  autor text,
  lei_afetada text,
  status_kanban text NOT NULL DEFAULT 'novo',
  url text,
  dados jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kanban_status ON public.kanban_proposicoes(status_kanban, atualizado_em DESC);
GRANT SELECT ON public.kanban_proposicoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_proposicoes TO authenticated;
GRANT ALL ON public.kanban_proposicoes TO service_role;
ALTER TABLE public.kanban_proposicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read kanban" ON public.kanban_proposicoes FOR SELECT USING (true);
CREATE POLICY "Auth write kanban" ON public.kanban_proposicoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC estatisticas_estudo
CREATE OR REPLACE FUNCTION public.estatisticas_estudo(p_user_id uuid)
RETURNS TABLE(tabela_nome text, total_sessoes bigint, total_questoes bigint, total_corretas bigint, pct_acerto integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    tabela_nome,
    COUNT(*)::bigint AS total_sessoes,
    COALESCE(SUM(total),0)::bigint AS total_questoes,
    COALESCE(SUM(correct),0)::bigint AS total_corretas,
    CASE WHEN COALESCE(SUM(total),0) > 0
      THEN ROUND((SUM(correct)::numeric / SUM(total)::numeric) * 100)::int
      ELSE 0 END AS pct_acerto
  FROM public.study_sessions
  WHERE user_id = p_user_id
  GROUP BY tabela_nome;
$$;
