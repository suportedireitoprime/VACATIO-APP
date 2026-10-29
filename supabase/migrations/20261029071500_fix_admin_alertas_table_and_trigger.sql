-- 1. Criar tabela admin_alertas caso não exista
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

-- 2. Proteger a função de alerta de trial contra qualquer falha
CREATE OR REPLACE FUNCTION public.enfileirar_alerta_trial_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR public.is_admin_user(NEW.user_id) THEN 
    RETURN NEW; 
  END IF;

  BEGIN
    INSERT INTO public.admin_alertas (tipo, user_id, payload)
    VALUES ('trial', NEW.user_id, jsonb_build_object(
      'origem', 'app_3_dias',
      'plano', COALESCE(NEW.plano, 'mensal'),
      'trial_days', NEW.trial_days,
      'started_at', COALESCE(NEW.trial_started_at, now())
    ))
    ON CONFLICT (tipo, user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alerta_trial_reminders ON public.trial_reminders;
CREATE TRIGGER trg_alerta_trial_reminders
  AFTER INSERT ON public.trial_reminders
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_alerta_trial_app();

