CREATE OR REPLACE FUNCTION public.admin_gerenciar_usuario(_user_id uuid, _acao text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t record;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;
  IF _user_id IS NULL OR _user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'self_action_blocked');
  END IF;

  IF _acao = 'ban' THEN
    UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = _user_id;
    DELETE FROM auth.sessions WHERE user_id = _user_id;
    RETURN jsonb_build_object('success', true, 'acao', 'ban');
  ELSIF _acao = 'unban' THEN
    UPDATE auth.users SET banned_until = NULL WHERE id = _user_id;
    RETURN jsonb_build_object('success', true, 'acao', 'unban');
  ELSIF _acao = 'delete' THEN
    FOR t IN
      SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
      WHERE c.table_schema = 'public'
        AND c.column_name = 'user_id'
        AND tb.table_type = 'BASE TABLE'
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', t.table_name) USING _user_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;

    BEGIN
      DELETE FROM public.profiles WHERE id = _user_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    DELETE FROM auth.users WHERE id = _user_id;
    RETURN jsonb_build_object('success', true, 'acao', 'delete');
  END IF;

  RETURN jsonb_build_object('error', 'invalid_params');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_gerenciar_usuario(uuid, text) TO authenticated;