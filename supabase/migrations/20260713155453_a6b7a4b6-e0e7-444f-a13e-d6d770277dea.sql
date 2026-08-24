CREATE TABLE public.user_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dias TEXT[] NOT NULL DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  horario TIME NOT NULL DEFAULT '20:00:00',
  ativo BOOLEAN NOT NULL DEFAULT true,
  mensagem_tipo TEXT NOT NULL DEFAULT 'geral',
  local_notification_ids INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_reminders TO authenticated;
GRANT ALL ON public.user_reminders TO service_role;

ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders" ON public.user_reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_reminders_updated_at
  BEFORE UPDATE ON public.user_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_reminders_user ON public.user_reminders(user_id) WHERE ativo = true;