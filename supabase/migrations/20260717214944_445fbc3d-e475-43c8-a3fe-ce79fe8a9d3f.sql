
-- 1) horus_user_stats
CREATE TABLE public.horus_user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  telefone text UNIQUE,
  nome_preferido text,
  plano_atual text DEFAULT 'free',
  plano_expira_em timestamptz,
  ultima_atividade_em timestamptz,
  dias_streak_estudo int DEFAULT 0,
  materia_mais_estudada_7d text,
  materia_mais_estudada_30d text,
  ultimas_buscas jsonb DEFAULT '[]'::jsonb,
  ultimo_artigo_lido text,
  ultimo_resumo_visto text,
  total_questoes_respondidas int DEFAULT 0,
  pct_acerto_geral int DEFAULT 0,
  livros_favoritos jsonb DEFAULT '[]'::jsonb,
  notificacoes_permitidas boolean DEFAULT true,
  preferencia_horario_contato text DEFAULT 'tarde',
  contexto_formatado text,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.horus_user_stats TO authenticated;
GRANT ALL ON public.horus_user_stats TO service_role;

ALTER TABLE public.horus_user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON public.horus_user_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage all stats"
  ON public.horus_user_stats FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE INDEX horus_user_stats_telefone_idx ON public.horus_user_stats(telefone);
CREATE INDEX horus_user_stats_user_id_idx ON public.horus_user_stats(user_id);

CREATE TRIGGER trg_horus_user_stats_updated
BEFORE UPDATE ON public.horus_user_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) horus_intent_logs
CREATE TABLE public.horus_intent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  mensagem text,
  intent text,
  confidence numeric,
  redirect boolean DEFAULT false,
  agente_id uuid,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.horus_intent_logs TO authenticated;
GRANT ALL ON public.horus_intent_logs TO service_role;

ALTER TABLE public.horus_intent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view intent logs"
  ON public.horus_intent_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX horus_intent_logs_telefone_idx ON public.horus_intent_logs(telefone, created_at DESC);
CREATE INDEX horus_intent_logs_intent_idx ON public.horus_intent_logs(intent);

-- 3) horus_proactive_log
CREATE TABLE public.horus_proactive_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  user_id uuid,
  motivo text NOT NULL,
  mensagem_enviada text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  respondida boolean DEFAULT false,
  respondida_em timestamptz,
  enviada_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.horus_proactive_log TO authenticated;
GRANT ALL ON public.horus_proactive_log TO service_role;

ALTER TABLE public.horus_proactive_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view proactive log"
  ON public.horus_proactive_log FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX horus_proactive_log_telefone_idx ON public.horus_proactive_log(telefone, enviada_em DESC);
CREATE INDEX horus_proactive_log_motivo_idx ON public.horus_proactive_log(motivo);

-- 4) off_topic_streak em horus_conversations
ALTER TABLE public.horus_conversations
  ADD COLUMN IF NOT EXISTS off_topic_streak int NOT NULL DEFAULT 0;

-- 5) usa_estatisticas em horus_funcoes
ALTER TABLE public.horus_funcoes
  ADD COLUMN IF NOT EXISTS usa_estatisticas boolean NOT NULL DEFAULT true;

-- 6) toggle mestre de proativos
CREATE TABLE IF NOT EXISTS public.horus_config (
  chave text PRIMARY KEY,
  valor jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.horus_config TO authenticated;
GRANT ALL ON public.horus_config TO service_role;

ALTER TABLE public.horus_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage horus_config"
  ON public.horus_config FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

INSERT INTO public.horus_config (chave, valor) VALUES
  ('proativos_pausados', 'false'::jsonb),
  ('proativos_frequencia_horas', '48'::jsonb)
ON CONFLICT (chave) DO NOTHING;
