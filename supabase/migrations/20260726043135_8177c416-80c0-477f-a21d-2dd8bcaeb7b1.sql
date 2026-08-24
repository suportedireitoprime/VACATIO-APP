
-- 1) Backfill: normaliza phone_e164 sem "+" na tabela de códigos
UPDATE public.horus_verification_codes
SET phone_e164 = regexp_replace(phone_e164, '^\+', '')
WHERE phone_e164 LIKE '+%';

-- 2) Tabela de notificações de takeover
CREATE TABLE IF NOT EXISTS public.horus_phone_takeover_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone_e164 text NOT NULL,
  new_owner_email text,
  new_owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_horus_takeover_user_unack
  ON public.horus_phone_takeover_notices(user_id, acknowledged_at NULLS FIRST, created_at DESC);

GRANT SELECT, UPDATE ON public.horus_phone_takeover_notices TO authenticated;
GRANT ALL ON public.horus_phone_takeover_notices TO service_role;

ALTER TABLE public.horus_phone_takeover_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "takeover_notices_select_own"
  ON public.horus_phone_takeover_notices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "takeover_notices_ack_own"
  ON public.horus_phone_takeover_notices
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime
ALTER TABLE public.horus_phone_takeover_notices REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'horus_phone_takeover_notices';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.horus_phone_takeover_notices';
  END IF;
END $$;

-- 3) RPC atualizada: normaliza phone, grava aviso pro dono antigo, retorna dados novos
CREATE OR REPLACE FUNCTION public.horus_transferir_numero(_new_user_id uuid, _phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_user_id uuid;
  v_transferred boolean := false;
  v_display_name text;
  v_recent_count int;
  v_new_email text;
  v_phone text;
BEGIN
  IF _new_user_id IS NULL OR _phone IS NULL OR length(_phone) < 8 THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  -- Normaliza SEM "+"
  v_phone := regexp_replace(_phone, '^\+', '');

  -- Rate-limit
  SELECT count(*) INTO v_recent_count
  FROM public.horus_phone_transfers
  WHERE phone_e164 = v_phone
    AND created_at > now() - interval '24 hours';
  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  SELECT user_id INTO v_old_user_id
  FROM public.horus_whatsapp_users
  WHERE phone_e164 = v_phone AND user_id IS DISTINCT FROM _new_user_id
  LIMIT 1;

  -- Email do novo dono (pra notificar quem perdeu)
  SELECT email INTO v_new_email FROM auth.users WHERE id = _new_user_id;

  IF v_old_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET telefone = NULL
    WHERE id = v_old_user_id
      AND regexp_replace(coalesce(telefone,''), '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g');

    INSERT INTO public.horus_phone_transfers (phone_e164, from_user_id, to_user_id)
    VALUES (v_phone, v_old_user_id, _new_user_id);

    -- Aviso pro dono antigo (realtime)
    INSERT INTO public.horus_phone_takeover_notices
      (user_id, phone_e164, new_owner_email, new_owner_user_id)
    VALUES
      (v_old_user_id, v_phone, v_new_email, _new_user_id);

    UPDATE public.horus_verification_codes
    SET consumed_at = now()
    WHERE phone_e164 = v_phone AND user_id = v_old_user_id AND consumed_at IS NULL;

    DELETE FROM public.horus_conversations WHERE phone_e164 = v_phone;
    DELETE FROM public.horus_memoria WHERE user_phone = v_phone;
    DELETE FROM public.horus_user_stats WHERE phone_e164 = v_phone;

    DELETE FROM public.horus_whatsapp_users WHERE phone_e164 = v_phone;
    v_transferred := true;
  END IF;

  DELETE FROM public.horus_whatsapp_users
  WHERE user_id = _new_user_id AND phone_e164 <> v_phone;

  SELECT display_name INTO v_display_name FROM public.profiles WHERE id = _new_user_id;

  INSERT INTO public.horus_whatsapp_users (
    user_id, linked_user_id, phone_e164, verified_at, linked_at,
    onboarding_state, display_name, nome_preferido, first_seen_at, last_seen_at
  )
  VALUES (
    _new_user_id, _new_user_id, v_phone, now(), now(),
    'ativo', v_display_name, v_display_name, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    phone_e164 = EXCLUDED.phone_e164,
    linked_user_id = EXCLUDED.linked_user_id,
    verified_at = EXCLUDED.verified_at,
    linked_at = EXCLUDED.linked_at,
    onboarding_state = 'ativo',
    display_name = COALESCE(public.horus_whatsapp_users.display_name, EXCLUDED.display_name),
    nome_preferido = COALESCE(public.horus_whatsapp_users.nome_preferido, EXCLUDED.nome_preferido);

  UPDATE public.profiles SET telefone = v_phone WHERE id = _new_user_id;

  RETURN jsonb_build_object(
    'transferred', v_transferred,
    'from_user_id', v_old_user_id,
    'display_name', v_display_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.horus_transferir_numero(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.horus_transferir_numero(uuid, text) TO service_role;

-- Realtime também para horus_whatsapp_users (refresh instantâneo da UI do novo dono)
ALTER TABLE public.horus_whatsapp_users REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'horus_whatsapp_users';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.horus_whatsapp_users';
  END IF;
END $$;
