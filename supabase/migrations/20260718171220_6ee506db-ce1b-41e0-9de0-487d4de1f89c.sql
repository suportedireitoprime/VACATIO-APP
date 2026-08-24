CREATE TABLE public.blog_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id uuid NOT NULL,
  autor_nome text,
  comentario text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_post_comments_post ON public.blog_post_comments(post_id, created_at DESC);

GRANT SELECT ON public.blog_post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.blog_post_comments TO authenticated;
GRANT ALL ON public.blog_post_comments TO service_role;

ALTER TABLE public.blog_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_any" ON public.blog_post_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.blog_post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.blog_post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);