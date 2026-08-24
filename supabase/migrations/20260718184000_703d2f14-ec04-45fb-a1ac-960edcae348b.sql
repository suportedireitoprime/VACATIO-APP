-- Índices para acelerar `blog_posts_trending`. A RPC filtra por
-- created_at > now() - interval e agrupa por post_id em duas tabelas.
-- Sem esses índices, cada chamada faz seq scan das duas tabelas.
CREATE INDEX IF NOT EXISTS blog_post_views_created_at_idx
  ON public.blog_post_views (created_at DESC);
CREATE INDEX IF NOT EXISTS blog_post_views_post_created_idx
  ON public.blog_post_views (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS blog_post_likes_created_at_idx
  ON public.blog_post_likes (created_at DESC);
CREATE INDEX IF NOT EXISTS blog_post_likes_post_created_idx
  ON public.blog_post_likes (post_id, created_at DESC);