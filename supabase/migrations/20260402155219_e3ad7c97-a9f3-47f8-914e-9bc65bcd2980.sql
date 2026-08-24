
CREATE TABLE public.mensagens_suporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  assunto text NOT NULL,
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mensagens_suporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own support messages"
ON public.mensagens_suporte
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own support messages"
ON public.mensagens_suporte
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
