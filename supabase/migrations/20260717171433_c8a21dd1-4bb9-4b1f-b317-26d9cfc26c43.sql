
-- 1) Colunas extras em push_campaigns
ALTER TABLE public.push_campaigns
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS emoji text,
  ADD COLUMN IF NOT EXISTS automation_key text,
  ADD COLUMN IF NOT EXISTS click_url text;

-- 2) Tabela de automações de push
CREATE TABLE IF NOT EXISTS public.push_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  enabled boolean NOT NULL DEFAULT false,
  audience jsonb NOT NULL DEFAULT '{"all":true,"platforms":["android","ios","web"],"premium":"all"}'::jsonb,
  default_url text,
  emoji text,
  usa_ia boolean NOT NULL DEFAULT true,
  cooldown_minutos integer NOT NULL DEFAULT 30,
  quiet_hours_inicio smallint NOT NULL DEFAULT 22,
  quiet_hours_fim smallint NOT NULL DEFAULT 7,
  usa_capa boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_automations TO authenticated;
GRANT ALL ON public.push_automations TO service_role;

ALTER TABLE public.push_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage push automations" ON public.push_automations;
CREATE POLICY "admins manage push automations"
ON public.push_automations FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_push_automations_updated_at ON public.push_automations;
CREATE TRIGGER trg_push_automations_updated_at
BEFORE UPDATE ON public.push_automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed inicial de automações (idempotente)
INSERT INTO public.push_automations (key, nome, descricao, enabled, default_url, emoji, usa_ia, cooldown_minutos, usa_capa)
VALUES
  ('radar_leis_novas', 'Radar de Leis — novas normas', 'Dispara quando o scraper encontra novas leis, decretos, MPs e projetos na Resenha Diária.', true,  '/radar-360',   '⚖️', true, 60, true),
  ('resenha_diaria_manha', 'Resenha diária — resumo das 08h', 'Um resumo curado das novidades legislativas enviado toda manhã.',            false, '/radar-360',   '📰', true, 720, true),
  ('noticias_juridicas_novas', 'Notícias jurídicas', 'Dispara quando uma nova notícia jurídica de destaque é publicada.',                       false, '/noticias',     '🗞️', true, 30, true),
  ('blog_edicao_publicado', 'Blog — nova edição', 'Notifica sobre novos posts publicados no blog.',                                             false, '/novidades',    '✍️', true, 60, true),
  ('videoaula_nova', 'Nova videoaula', 'Notifica quando uma nova videoaula é adicionada.',                                                       false, '/aprender',     '🎥', true, 60, true),
  ('curiosidade_diaria', 'Curiosidade jurídica do dia', 'Envia uma curiosidade jurídica diária.',                                                false, '/',             '💡', true, 720, true),
  ('biblioteca_novo_livro', 'Novo livro na Biblioteca', 'Notifica quando um novo livro é adicionado à biblioteca.',                              false, '/biblioteca',   '📚', true, 60, true),
  ('simulado_lembrete', 'Lembrete de simulado', 'Convida o usuário a continuar ou fazer um novo simulado.',                                      false, '/simulado',     '📝', true, 1440, false),
  ('aviso_admin', 'Aviso administrativo', 'Comunicados oficiais enviados pelo admin.',                                                            false, '/',             '📢', false, 0, false)
ON CONFLICT (key) DO NOTHING;

-- 4) Índices úteis
CREATE INDEX IF NOT EXISTS idx_push_campaigns_automation_key ON public.push_campaigns (automation_key);
CREATE INDEX IF NOT EXISTS idx_push_campaigns_tipo_created ON public.push_campaigns (tipo, created_at DESC);
