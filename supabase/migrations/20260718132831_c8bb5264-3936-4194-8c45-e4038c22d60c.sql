ALTER TABLE public.horus_whatsapp_users
  ADD COLUMN IF NOT EXISTS nome_preferido text,
  ADD COLUMN IF NOT EXISTS notif_prefs jsonb NOT NULL DEFAULT jsonb_build_object(
    'radar_leis', true,
    'boletim_juridico', true,
    'boletim_leis', true,
    'blog_novos_posts', true,
    'app_atualizacoes', true,
    'artigo_favorito', true
  );