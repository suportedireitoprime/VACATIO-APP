
ALTER TABLE public.horus_user_stats
  ADD COLUMN IF NOT EXISTS horarios_pico_app integer[];

INSERT INTO public.push_automations (key, nome, descricao, enabled, default_url, emoji)
VALUES
  ('boletim_leis_matinal', 'Boletim de Leis matinal', 'Resumo das leis publicadas nas últimas 24h, disparado às 07h. Só envia se houver leis novas.', true, '/radar-360', '📜'),
  ('blog_post_manha',      'Blog — post da manhã',    'Notifica o próximo post do dia às 08h.', true, '/blog', '📰'),
  ('blog_post_tarde',      'Blog — post da tarde',    'Notifica o próximo post do dia às 13h.', true, '/blog', '☕'),
  ('blog_post_noite',      'Blog — post da noite',    'Notifica o próximo post do dia às 19h.', true, '/blog', '🌙'),
  ('personalizada_app',    'Personalizada (App)',     'Push personalizado com o nome do usuário no horário de maior atividade dele.', true, '/', '✨'),
  ('personalizada_horus',  'Personalizada (Horus)',   'Mensagem personalizada do Horus no WhatsApp, no horário-pico do usuário.', true, null, '🦉')
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  fn_url_base text := 'https://iftdrbxvekrhzstayjwp.supabase.co/functions/v1';
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40';
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='boletim-leis-matinal-07brt') THEN PERFORM cron.unschedule('boletim-leis-matinal-07brt'); END IF;
  PERFORM cron.schedule('boletim-leis-matinal-07brt', '0 10 * * *',
    format($f$SELECT net.http_post(url:='%s/boletim-leis-matinal', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s'))$f$, fn_url_base, anon));

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='blog-push-manha') THEN PERFORM cron.unschedule('blog-push-manha'); END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='blog-push-tarde') THEN PERFORM cron.unschedule('blog-push-tarde'); END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='blog-push-noite') THEN PERFORM cron.unschedule('blog-push-noite'); END IF;
  PERFORM cron.schedule('blog-push-manha','0 11 * * *',
    format($f$SELECT net.http_post(url:='%s/blog-push-slot', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s'), body:=jsonb_build_object('slot','manha','automation_key','blog_post_manha'))$f$, fn_url_base, anon));
  PERFORM cron.schedule('blog-push-tarde','0 16 * * *',
    format($f$SELECT net.http_post(url:='%s/blog-push-slot', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s'), body:=jsonb_build_object('slot','tarde','automation_key','blog_post_tarde'))$f$, fn_url_base, anon));
  PERFORM cron.schedule('blog-push-noite','0 22 * * *',
    format($f$SELECT net.http_post(url:='%s/blog-push-slot', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s'), body:=jsonb_build_object('slot','noite','automation_key','blog_post_noite'))$f$, fn_url_base, anon));

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='recalcular-horarios-pico') THEN PERFORM cron.unschedule('recalcular-horarios-pico'); END IF;
  PERFORM cron.schedule('recalcular-horarios-pico','0 6 * * *',
    format($f$SELECT net.http_post(url:='%s/recalcular-horarios-pico', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s'))$f$, fn_url_base, anon));

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='personalizada-app-hora')   THEN PERFORM cron.unschedule('personalizada-app-hora');   END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='personalizada-horus-hora') THEN PERFORM cron.unschedule('personalizada-horus-hora'); END IF;
  PERFORM cron.schedule('personalizada-app-hora','5 * * * *',
    format($f$SELECT net.http_post(url:='%s/notificacao-personalizada-app', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s'))$f$, fn_url_base, anon));
  PERFORM cron.schedule('personalizada-horus-hora','15 * * * *',
    format($f$SELECT net.http_post(url:='%s/notificacao-personalizada-horus', headers:=jsonb_build_object('Content-Type','application/json','apikey','%s'))$f$, fn_url_base, anon));
END $$;
