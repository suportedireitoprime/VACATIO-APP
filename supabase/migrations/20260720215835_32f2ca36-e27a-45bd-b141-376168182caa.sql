
-- =========================
-- reading_reminders
-- =========================
CREATE TABLE IF NOT EXISTS public.reading_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  livro_id text,               -- null => lembrete geral de rotina
  livro_area text,             -- coleção/tabela de origem, p/ resolver capa/título
  livro_titulo text,           -- snapshot p/ mensagem sem novo join
  livro_capa text,             -- snapshot
  title text NOT NULL DEFAULT 'Hora de ler',
  time_of_day text NOT NULL,   -- 'HH:MM' 24h
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  preset text NOT NULL DEFAULT 'daily', -- daily|weekdays|weekends|custom
  days_of_week smallint[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::smallint[], -- 0=Dom..6=Sáb
  channels text[] NOT NULL DEFAULT ARRAY['push']::text[], -- push|local|horus_whatsapp
  message_style text NOT NULL DEFAULT 'padrao', -- padrao|motivacional|bem_humorado|zen
  enabled boolean NOT NULL DEFAULT true,
  last_fired_at timestamptz,
  next_fire_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_reminders TO authenticated;
GRANT ALL ON public.reading_reminders TO service_role;

ALTER TABLE public.reading_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own reminders select" ON public.reading_reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reminders insert" ON public.reading_reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reminders update" ON public.reading_reminders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reminders delete" ON public.reading_reminders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reading_reminders_user_idx ON public.reading_reminders(user_id);
CREATE INDEX IF NOT EXISTS reading_reminders_next_idx ON public.reading_reminders(enabled, next_fire_at);

CREATE TRIGGER reading_reminders_set_updated_at
  BEFORE UPDATE ON public.reading_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- push_subscriptions (Web Push VAPID)
-- =========================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  platform text NOT NULL DEFAULT 'web', -- web|android|ios
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push subs select" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own push subs insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subs update" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subs delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id, enabled);

CREATE TRIGGER push_subscriptions_set_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
