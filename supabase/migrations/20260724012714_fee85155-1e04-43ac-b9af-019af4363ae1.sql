
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS capa_id text NOT NULL DEFAULT 'capa1',
  ADD COLUMN IF NOT EXISTS interacoes_total bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS segundos_em_tela bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_user_metrics(p_clicks int, p_seconds int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.profiles (id, interacoes_total, segundos_em_tela)
  VALUES (v_uid, GREATEST(p_clicks, 0), GREATEST(p_seconds, 0))
  ON CONFLICT (id) DO UPDATE
    SET interacoes_total = public.profiles.interacoes_total + GREATEST(p_clicks, 0),
        segundos_em_tela = public.profiles.segundos_em_tela + GREATEST(p_seconds, 0),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_user_metrics(int, int) TO authenticated;
