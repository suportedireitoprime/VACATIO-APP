
CREATE TABLE public.chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  message_id text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('like','dislike')),
  pergunta text,
  resposta text,
  motivo text,
  web_search boolean NOT NULL DEFAULT false,
  sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.chat_feedback TO authenticated;
GRANT INSERT ON public.chat_feedback TO anon;
GRANT ALL ON public.chat_feedback TO service_role;

ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own feedback" ON public.chat_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "anon insert feedback" ON public.chat_feedback
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "users read own feedback" ON public.chat_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX chat_feedback_created_idx ON public.chat_feedback (created_at DESC);
CREATE INDEX chat_feedback_tipo_idx ON public.chat_feedback (tipo);
