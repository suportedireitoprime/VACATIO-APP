
CREATE TABLE public.app_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  comentario TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'funcionalidade',
  photo_url TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  platform TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_feedback_user ON public.app_feedback(user_id, created_at DESC);
CREATE INDEX idx_app_feedback_tag ON public.app_feedback(tag, created_at DESC);

GRANT SELECT, INSERT ON public.app_feedback TO authenticated;
GRANT ALL ON public.app_feedback TO service_role;

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
  ON public.app_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own feedback"
  ON public.app_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all feedback"
  ON public.app_feedback FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- storage.objects policies for feedback-photos bucket
CREATE POLICY "Users upload their feedback photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read their feedback photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins read all feedback photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-photos' AND public.is_admin_user(auth.uid())
  );
