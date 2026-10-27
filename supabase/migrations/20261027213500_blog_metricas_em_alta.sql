-- RPC para obter artigos em alta do blog ordenados por visualizações e curtidas
CREATE OR REPLACE FUNCTION public.blog_metricas_em_alta(_dias int DEFAULT 30)
RETURNS TABLE(post_id text, total_views bigint, total_likes bigint, score bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH views AS (
    SELECT post_id, COUNT(*) AS count_views
    FROM public.blog_post_views
    WHERE created_at >= (now() - (_dias || ' days')::interval)
    GROUP BY post_id
  ),
  likes AS (
    SELECT post_id, COUNT(*) AS count_likes
    FROM public.blog_post_likes
    GROUP BY post_id
  )
  SELECT
    COALESCE(v.post_id, l.post_id) AS post_id,
    COALESCE(v.count_views, 0) AS total_views,
    COALESCE(l.count_likes, 0) AS total_likes,
    (COALESCE(v.count_views, 0) + (COALESCE(l.count_likes, 0) * 3)) AS score
  FROM views v
  FULL OUTER JOIN likes l ON v.post_id = l.post_id
  ORDER BY score DESC;
$$;

GRANT EXECUTE ON FUNCTION public.blog_metricas_em_alta(int) TO anon, authenticated;
