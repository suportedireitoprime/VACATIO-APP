
CREATE OR REPLACE FUNCTION public.aplicar_hierarquia_lei(
  _lei_id uuid,
  _art_ids uuid[],
  _art_ordens integer[],
  _hier_numeros text[],
  _hier_textos text[],
  _hier_ordens integer[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_updates int := 0;
  n_inserts int := 0;
BEGIN
  -- Passo 1: empurra ordens existentes para faixa temporária alta
  UPDATE public.vade_mecum_artigos
     SET ordem = ordem + 5000000
   WHERE lei_id = _lei_id;

  -- Passo 2: aplica nova ordem aos artigos existentes
  UPDATE public.vade_mecum_artigos v
     SET ordem = u.new_ordem
    FROM unnest(_art_ids, _art_ordens) AS u(id, new_ordem)
   WHERE v.id = u.id;
  GET DIAGNOSTICS n_updates = ROW_COUNT;

  -- Passo 3: insere cabeçalhos de hierarquia
  INSERT INTO public.vade_mecum_artigos (lei_id, numero, texto, ordem)
  SELECT _lei_id, num, txt, ord
    FROM unnest(_hier_numeros, _hier_textos, _hier_ordens) AS h(num, txt, ord);
  GET DIAGNOSTICS n_inserts = ROW_COUNT;

  RETURN jsonb_build_object('updates', n_updates, 'inserts', n_inserts);
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_hierarquia_lei(uuid, uuid[], integer[], text[], text[], integer[]) TO service_role;
