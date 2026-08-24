
-- Tabela de auditoria de transferências
CREATE TABLE IF NOT EXISTS public.horus_phone_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  from_user_id uuid,
  to_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_horus_phone_transfers_phone ON public.horus_phone_transfers(phone_e164, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_horus_phone_transfers_to ON public.horus_phone_transfers(to_user_id);

GRANT SELECT ON public.horus_phone_transfers TO authenticated;
GRANT ALL ON public.horus_phone_transfers TO service_role;

ALTER TABLE public.horus_phone_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler transferências"
  ON public.horus_phone_transfers FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Função de transferência atômica
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
BEGIN
  IF _new_user_id IS NULL OR _phone IS NULL OR length(_phone) < 8 THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  -- Rate-limit: máximo 3 transferências desse número em 24h
  SELECT count(*) INTO v_recent_count
  FROM public.horus_phone_transfers
  WHERE phone_e164 = _phone
    AND created_at > now() - interval '24 hours';
  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- Localiza dono antigo (se existir e for outra conta)
  SELECT user_id INTO v_old_user_id
  FROM public.horus_whatsapp_users
  WHERE phone_e164 = _phone AND user_id IS DISTINCT FROM _new_user_id
  LIMIT 1;

  IF v_old_user_id IS NOT NULL THEN
    -- Limpa telefone do perfil antigo se bater
    UPDATE public.profiles
    SET telefone = NULL
    WHERE id = v_old_user_id
      AND regexp_replace(coalesce(telefone,''), '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g');

    -- Auditoria
    INSERT INTO public.horus_phone_transfers (phone_e164, from_user_id, to_user_id)
    VALUES (_phone, v_old_user_id, _new_user_id);

    -- Invalida códigos de verificação abertos do dono antigo pra esse número
    UPDATE public.horus_verification_codes
    SET consumed_at = now()
    WHERE phone_e164 = _phone AND user_id = v_old_user_id AND consumed_at IS NULL;

    -- Higieniza memória do WhatsApp (privacidade — novo dono começa do zero)
    DELETE FROM public.horus_conversations WHERE phone_e164 = _phone;
    DELETE FROM public.horus_memoria WHERE user_phone = _phone;
    DELETE FROM public.horus_user_stats WHERE phone_e164 = _phone;

    -- Remove registro antigo (libera UNIQUE)
    DELETE FROM public.horus_whatsapp_users WHERE phone_e164 = _phone;
    v_transferred := true;
  END IF;

  -- Se o novo usuário já tinha uma linha com outro número, remove pra respeitar UNIQUE(user_id)
  DELETE FROM public.horus_whatsapp_users
  WHERE user_id = _new_user_id AND phone_e164 <> _phone;

  -- Nome preferido a partir do profile
  SELECT display_name INTO v_display_name FROM public.profiles WHERE id = _new_user_id;

  -- Upsert do vínculo definitivo
  INSERT INTO public.horus_whatsapp_users (
    user_id, linked_user_id, phone_e164, verified_at, linked_at,
    onboarding_state, display_name, nome_preferido, first_seen_at, last_seen_at
  )
  VALUES (
    _new_user_id, _new_user_id, _phone, now(), now(),
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

  -- Sincroniza telefone no perfil do novo dono
  UPDATE public.profiles SET telefone = _phone WHERE id = _new_user_id;

  RETURN jsonb_build_object(
    'transferred', v_transferred,
    'from_user_id', v_old_user_id,
    'display_name', v_display_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.horus_transferir_numero(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.horus_transferir_numero(uuid, text) TO service_role;
