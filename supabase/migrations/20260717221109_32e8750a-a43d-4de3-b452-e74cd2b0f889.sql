-- ===== Boletins Jurídicos =====

-- Tipos possíveis de norma
CREATE TYPE public.boletim_tipo_norma AS ENUM (
  'lei', 'decreto', 'medida_provisoria', 'portaria', 'resolucao', 'instrucao_normativa', 'generico'
);

-- Boletins gerados
CREATE TABLE public.boletins_juridicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_ref DATE NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  roteiro_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{tipo, titulo, resumo, audio_url, imagem_url, duracao_s}]
  audio_urls TEXT[] DEFAULT '{}',
  video_url TEXT,
  thumb_url TEXT,
  duracao_s INTEGER,
  status TEXT NOT NULL DEFAULT 'gerando', -- gerando | renderizando | pronto | erro
  erro TEXT,
  github_run_id TEXT,
  gerado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(data_ref)
);
GRANT SELECT ON public.boletins_juridicos TO anon, authenticated;
GRANT ALL ON public.boletins_juridicos TO service_role;
ALTER TABLE public.boletins_juridicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Boletins prontos são públicos" ON public.boletins_juridicos
  FOR SELECT USING (status = 'pronto' OR public.is_admin_user(auth.uid()));
CREATE POLICY "Admins gerenciam boletins" ON public.boletins_juridicos
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_boletins_updated_at BEFORE UPDATE ON public.boletins_juridicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Imagem fixa por tipo de norma
CREATE TABLE public.boletim_tipo_imagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.boletim_tipo_norma NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  imagem_url TEXT NOT NULL,
  cor_hex TEXT DEFAULT '#3B82F6',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.boletim_tipo_imagens TO anon, authenticated;
GRANT ALL ON public.boletim_tipo_imagens TO service_role;
ALTER TABLE public.boletim_tipo_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tipo imagens públicas" ON public.boletim_tipo_imagens FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam tipo imagens" ON public.boletim_tipo_imagens
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_boletim_tipo_imagens_updated_at BEFORE UPDATE ON public.boletim_tipo_imagens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Configuração (single row)
CREATE TABLE public.boletim_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  voz_id TEXT NOT NULL DEFAULT 'Kore',
  voz_genero TEXT NOT NULL DEFAULT 'feminina',
  prompt_tts_extra TEXT NOT NULL DEFAULT 'Narração jornalística com entusiasmo, tom envolvente, ritmo dinâmico, pausas naturais entre normas e ênfase em números e nomes de leis. Voz clara e agradável para escutar antes de dormir.',
  horario_geracao TIME NOT NULL DEFAULT '21:00:00',
  github_workflow TEXT NOT NULL DEFAULT 'render-boletim.yml',
  max_normas INTEGER NOT NULL DEFAULT 6,
  ativo BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT boletim_config_single_row CHECK (id = 1)
);
GRANT SELECT ON public.boletim_config TO authenticated;
GRANT ALL ON public.boletim_config TO service_role;
ALTER TABLE public.boletim_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config visível a autenticados" ON public.boletim_config
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins editam config" ON public.boletim_config
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

INSERT INTO public.boletim_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Seed tipos (imagem_url será atualizada depois via storage)
INSERT INTO public.boletim_tipo_imagens (tipo, nome, imagem_url, cor_hex) VALUES
  ('lei', 'Lei Ordinária/Complementar', '', '#3B82F6'),
  ('decreto', 'Decreto', '#F59E0B', '#F59E0B'),
  ('medida_provisoria', 'Medida Provisória', '', '#EF4444'),
  ('portaria', 'Portaria', '', '#8B5CF6'),
  ('resolucao', 'Resolução', '', '#10B981'),
  ('instrucao_normativa', 'Instrução Normativa', '', '#EC4899'),
  ('generico', 'Norma Jurídica', '', '#64748B')
ON CONFLICT (tipo) DO NOTHING;

-- Automação de push
INSERT INTO public.push_automations (key, nome, descricao, enabled, emoji, default_url, audience, cooldown_minutos, quiet_hours_inicio, quiet_hours_fim)
VALUES (
  'boletim_juridico_diario',
  'Boletim Jurídico Diário',
  'Notifica os usuários quando o boletim jurídico do dia está pronto (aprox. 21h).',
  true,
  '🎙️',
  '/boletins',
  '{"all": true}'::jsonb,
  60,
  0,
  0
)
ON CONFLICT (key) DO NOTHING;
