CREATE TABLE IF NOT EXISTS public.admin_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('cadastro','trial')),
  user_id uuid,
  status text NOT NULL DEFAULT 'pendente',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  erro text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_alertas_tipo_user_uk ON public.admin_alertas (tipo, user_id);
CREATE INDEX IF NOT EXISTS admin_alertas_status_idx ON public.admin_alertas (status, created_at);

GRANT SELECT ON public.admin_alertas TO authenticated;
GRANT ALL ON public.admin_alertas TO service_role;

ALTER TABLE public.admin_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver alertas" ON public.admin_alertas;
CREATE POLICY "Admins podem ver alertas" ON public.admin_alertas
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_admin_alertas_updated_at ON public.admin_alertas;
CREATE TRIGGER trg_admin_alertas_updated_at
  BEFORE UPDATE ON public.admin_alertas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enfileirar_alerta_cadastro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_alertas (tipo, user_id, payload)
  VALUES ('cadastro', NEW.id, jsonb_build_object('origem', 'profiles'))
  ON CONFLICT (tipo, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enfileirar_alerta_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.admin_alertas (tipo, user_id, payload)
  VALUES ('trial', NEW.user_id, jsonb_build_object(
    'loja', TG_TABLE_NAME,
    'product_id', NEW.product_id
  ))
  ON CONFLICT (tipo, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alerta_cadastro ON public.profiles;
CREATE TRIGGER trg_alerta_cadastro
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_alerta_cadastro();

DROP TRIGGER IF EXISTS trg_alerta_trial_play ON public.play_subscriptions;
CREATE TRIGGER trg_alerta_trial_play
  AFTER INSERT ON public.play_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_alerta_trial();

DROP TRIGGER IF EXISTS trg_alerta_trial_apple ON public.apple_subscriptions;
CREATE TRIGGER trg_alerta_trial_apple
  AFTER INSERT ON public.apple_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_alerta_trial();