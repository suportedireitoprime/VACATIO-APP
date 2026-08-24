
-- Tabela de visualizações de posts do blog
CREATE TABLE public.blog_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_post_views_post_created ON public.blog_post_views(post_id, created_at DESC);
GRANT SELECT, INSERT ON public.blog_post_views TO anon, authenticated;
GRANT ALL ON public.blog_post_views TO service_role;
ALTER TABLE public.blog_post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views_insert_any" ON public.blog_post_views FOR INSERT WITH CHECK (true);
CREATE POLICY "views_select_any" ON public.blog_post_views FOR SELECT USING (true);

-- Tabela de curtidas
CREATE TABLE public.blog_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX idx_blog_post_likes_post ON public.blog_post_likes(post_id);
GRANT SELECT ON public.blog_post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.blog_post_likes TO authenticated;
GRANT ALL ON public.blog_post_likes TO service_role;
ALTER TABLE public.blog_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select_any" ON public.blog_post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.blog_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.blog_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RPC de ranking (views + 3*likes) na janela _dias
CREATE OR REPLACE FUNCTION public.blog_posts_trending(_limit int DEFAULT 50, _dias int DEFAULT 14)
RETURNS TABLE(post_id text, views bigint, likes bigint, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH v AS (
    SELECT post_id, COUNT(*)::bigint AS views
    FROM public.blog_post_views
    WHERE created_at > now() - (_dias || ' days')::interval
    GROUP BY post_id
  ),
  l AS (
    SELECT post_id, COUNT(*)::bigint AS likes
    FROM public.blog_post_likes
    WHERE created_at > now() - (_dias || ' days')::interval
    GROUP BY post_id
  )
  SELECT
    COALESCE(v.post_id, l.post_id) AS post_id,
    COALESCE(v.views, 0) AS views,
    COALESCE(l.likes, 0) AS likes,
    (COALESCE(v.views, 0) + 3 * COALESCE(l.likes, 0))::numeric AS score
  FROM v FULL OUTER JOIN l ON v.post_id = l.post_id
  ORDER BY score DESC
  LIMIT greatest(_limit, 1);
$$;
GRANT EXECUTE ON FUNCTION public.blog_posts_trending(int, int) TO anon, authenticated;
