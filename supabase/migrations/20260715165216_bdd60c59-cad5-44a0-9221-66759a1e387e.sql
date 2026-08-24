
CREATE TABLE public.blog_edicao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posts_por_dia int NOT NULL DEFAULT 3,
  horarios time[] NOT NULL DEFAULT ARRAY['08:00','13:00','19:00']::time[],
  intervalo_minutos int,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  modo_publicacao text NOT NULL DEFAULT 'auto',
  modelo_texto text NOT NULL DEFAULT 'gemini-2.5-flash-lite',
  tom text NOT NULL DEFAULT 'didático, envolvente, brasileiro, para estudantes de Direito',
  tamanho_alvo int NOT NULL DEFAULT 1600,
  estilo_capa_prompt text NOT NULL DEFAULT 'Editorial illustration in the style of a classic law textbook cover: a central symbolic subject (portrait, silhouette, artifact or scene tied to the article theme) with dramatic chiaroscuro lighting, warm parchment texture background, subtle gold and burgundy accents, hand-drawn ink details, no text, no logos, painterly finish, evocative and timeless.',
  push_ativo boolean NOT NULL DEFAULT true,
  push_titulo_template text NOT NULL DEFAULT '📖 {titulo}',
  push_corpo_template text NOT NULL DEFAULT '{headline}',
  push_audiencia jsonb NOT NULL DEFAULT '{"all": true}'::jsonb,
  push_quiet_start time DEFAULT '22:00',
  push_quiet_end time DEFAULT '07:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_edicao_config TO authenticated;
GRANT ALL ON public.blog_edicao_config TO service_role;
ALTER TABLE public.blog_edicao_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read config" ON public.blog_edicao_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write config" ON public.blog_edicao_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.blog_edicao_temas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem int NOT NULL DEFAULT 0,
  titulo_sugerido text NOT NULL,
  categoria text NOT NULL DEFAULT 'Filosofia',
  resumo_briefing text,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pendente',
  agendado_para timestamptz,
  post_id text,
  erro text,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_edicao_temas_status ON public.blog_edicao_temas(status, agendado_para);
CREATE INDEX idx_blog_edicao_temas_ordem ON public.blog_edicao_temas(ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_edicao_temas TO authenticated;
GRANT ALL ON public.blog_edicao_temas TO service_role;
ALTER TABLE public.blog_edicao_temas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage temas" ON public.blog_edicao_temas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.blog_edicao_posts (
  id text PRIMARY KEY,
  tema_id uuid REFERENCES public.blog_edicao_temas(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  resumo text NOT NULL,
  conteudo_md text NOT NULL,
  imagem_url text NOT NULL,
  imagem_path text,
  imagem_thumb_url text,
  headline_push text,
  categoria text NOT NULL,
  autor text NOT NULL DEFAULT 'Redação OAB na Risca',
  tempo_leitura_min int NOT NULL DEFAULT 6,
  publicado boolean NOT NULL DEFAULT true,
  push_campaign_id uuid,
  data_publicacao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_edicao_posts_pub ON public.blog_edicao_posts(publicado, data_publicacao DESC);
GRANT SELECT ON public.blog_edicao_posts TO anon, authenticated;
GRANT ALL ON public.blog_edicao_posts TO service_role;
ALTER TABLE public.blog_edicao_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read posts publicados" ON public.blog_edicao_posts FOR SELECT USING (publicado = true);
CREATE POLICY "auth manage posts" ON public.blog_edicao_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.blog_edicao_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id uuid,
  evento text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.blog_edicao_logs TO authenticated;
GRANT ALL ON public.blog_edicao_logs TO service_role;
ALTER TABLE public.blog_edicao_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read logs" ON public.blog_edicao_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert logs" ON public.blog_edicao_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER trg_bec_updated BEFORE UPDATE ON public.blog_edicao_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bet_updated BEFORE UPDATE ON public.blog_edicao_temas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.blog_edicao_config (id) VALUES (gen_random_uuid());

-- Storage policies para o bucket blog-capas (privado; usamos signed URLs)
CREATE POLICY "blog-capas auth read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'blog-capas');
CREATE POLICY "blog-capas svc write" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'blog-capas') WITH CHECK (bucket_id = 'blog-capas');
