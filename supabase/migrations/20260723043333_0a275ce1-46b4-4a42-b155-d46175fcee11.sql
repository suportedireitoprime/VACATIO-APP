
-- Atualiza a função de recálculo para incluir o peso de revisão (15%)
CREATE OR REPLACE FUNCTION public.recalcular_dominio_area(p_user_id uuid, p_area_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_aulas int;
  v_concluidas int;
  v_cobertura numeric;
  v_acertos_total int;
  v_perguntas_total int;
  v_acertos numeric;
  v_total_flash int;
  v_flash_em_dia int;
  v_revisao numeric;
  v_score numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_aulas
  FROM public.aprender_aulas au
  JOIN public.aprender_modulos m ON m.id = au.modulo_id
  WHERE m.area_id = p_area_id AND au.status = 'published';

  IF v_total_aulas = 0 THEN
    DELETE FROM public.aprender_dominio_area WHERE user_id = p_user_id AND area_id = p_area_id;
    RETURN;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE pa.concluida_em IS NOT NULL),
    COALESCE(SUM(pa.acertos) FILTER (WHERE pa.concluida_em IS NOT NULL), 0),
    COALESCE(SUM(pa.total_perguntas) FILTER (WHERE pa.concluida_em IS NOT NULL), 0)
  INTO v_concluidas, v_acertos_total, v_perguntas_total
  FROM public.aprender_progresso_aula pa
  JOIN public.aprender_aulas au ON au.id = pa.aula_id
  JOIN public.aprender_modulos m ON m.id = au.modulo_id
  WHERE pa.user_id = p_user_id AND m.area_id = p_area_id AND au.status = 'published';

  -- Revisão: flashcards da área com proxima_revisao_em ainda no futuro
  SELECT
    COUNT(*) FILTER (WHERE pb.proxima_revisao_em IS NOT NULL),
    COUNT(*) FILTER (WHERE pb.proxima_revisao_em IS NOT NULL AND pb.proxima_revisao_em > now())
  INTO v_total_flash, v_flash_em_dia
  FROM public.aprender_progresso_bloco pb
  JOIN public.aprender_blocos b ON b.id = pb.bloco_id
  JOIN public.aprender_aulas au ON au.id = b.aula_id
  JOIN public.aprender_modulos m ON m.id = au.modulo_id
  WHERE pb.user_id = p_user_id AND m.area_id = p_area_id AND b.tipo = 'flashcard';

  v_cobertura := LEAST(1.0, v_concluidas::numeric / v_total_aulas::numeric);
  v_acertos := CASE WHEN v_perguntas_total > 0 THEN v_acertos_total::numeric / v_perguntas_total::numeric ELSE 0 END;
  v_revisao := CASE WHEN v_total_flash > 0 THEN v_flash_em_dia::numeric / v_total_flash::numeric ELSE 0 END;

  v_score := ROUND((0.5 * v_cobertura + 0.35 * v_acertos + 0.15 * v_revisao) * 100, 1);
  IF v_score > 100 THEN v_score := 100; END IF;

  INSERT INTO public.aprender_dominio_area (user_id, area_id, score, atualizado_em)
  VALUES (p_user_id, p_area_id, v_score, now())
  ON CONFLICT (user_id, area_id) DO UPDATE
    SET score = EXCLUDED.score, atualizado_em = now();
END;
$$;

-- Trigger que dispara recálculo quando um flashcard é revisado
CREATE OR REPLACE FUNCTION public.trg_progresso_bloco_dominio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area_id uuid;
BEGIN
  SELECT m.area_id INTO v_area_id
  FROM public.aprender_blocos b
  JOIN public.aprender_aulas au ON au.id = b.aula_id
  JOIN public.aprender_modulos m ON m.id = au.modulo_id
  WHERE b.id = COALESCE(NEW.bloco_id, OLD.bloco_id);
  IF v_area_id IS NOT NULL THEN
    PERFORM public.recalcular_dominio_area(COALESCE(NEW.user_id, OLD.user_id), v_area_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aprender_progresso_bloco_dominio ON public.aprender_progresso_bloco;
CREATE TRIGGER trg_aprender_progresso_bloco_dominio
AFTER INSERT OR UPDATE ON public.aprender_progresso_bloco
FOR EACH ROW EXECUTE FUNCTION public.trg_progresso_bloco_dominio();

-- Contador de revisões devidas hoje
CREATE OR REPLACE FUNCTION public.aprender_revisoes_devidas(p_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.aprender_progresso_bloco pb
  JOIN public.aprender_blocos b ON b.id = pb.bloco_id
  WHERE pb.user_id = p_user_id
    AND b.tipo = 'flashcard'
    AND pb.proxima_revisao_em IS NOT NULL
    AND pb.proxima_revisao_em <= now();
$$;

GRANT EXECUTE ON FUNCTION public.aprender_revisoes_devidas(uuid) TO authenticated;
