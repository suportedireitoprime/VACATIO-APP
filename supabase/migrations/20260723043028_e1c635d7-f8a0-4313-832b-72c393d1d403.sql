
-- Phase 4: Domínio Jurídico — trigger que recalcula score por área

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
  v_score numeric;
BEGIN
  -- Aulas publicadas na área
  SELECT COUNT(*) INTO v_total_aulas
  FROM public.aprender_aulas au
  JOIN public.aprender_modulos m ON m.id = au.modulo_id
  WHERE m.area_id = p_area_id AND au.status = 'published';

  IF v_total_aulas = 0 THEN
    DELETE FROM public.aprender_dominio_area WHERE user_id = p_user_id AND area_id = p_area_id;
    RETURN;
  END IF;

  -- Concluídas + acertos do usuário nessa área
  SELECT
    COUNT(*) FILTER (WHERE pa.concluida_em IS NOT NULL),
    COALESCE(SUM(pa.acertos) FILTER (WHERE pa.concluida_em IS NOT NULL), 0),
    COALESCE(SUM(pa.total_perguntas) FILTER (WHERE pa.concluida_em IS NOT NULL), 0)
  INTO v_concluidas, v_acertos_total, v_perguntas_total
  FROM public.aprender_progresso_aula pa
  JOIN public.aprender_aulas au ON au.id = pa.aula_id
  JOIN public.aprender_modulos m ON m.id = au.modulo_id
  WHERE pa.user_id = p_user_id AND m.area_id = p_area_id AND au.status = 'published';

  v_cobertura := LEAST(1.0, v_concluidas::numeric / v_total_aulas::numeric);
  v_acertos := CASE WHEN v_perguntas_total > 0 THEN v_acertos_total::numeric / v_perguntas_total::numeric ELSE 0 END;
  -- Fase 4: revisao = 0
  v_score := ROUND((0.5 * v_cobertura + 0.35 * v_acertos) * 100, 1);
  -- normalizar para 0-100 considerando peso máximo 0.85 nesta fase
  v_score := ROUND(v_score / 0.85, 1);
  IF v_score > 100 THEN v_score := 100; END IF;

  INSERT INTO public.aprender_dominio_area (user_id, area_id, score, atualizado_em)
  VALUES (p_user_id, p_area_id, v_score, now())
  ON CONFLICT (user_id, area_id) DO UPDATE
    SET score = EXCLUDED.score, atualizado_em = now();
END;
$$;

-- Unique constraint necessária para o upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'aprender_dominio_area_user_area_key'
  ) THEN
    ALTER TABLE public.aprender_dominio_area
      ADD CONSTRAINT aprender_dominio_area_user_area_key UNIQUE (user_id, area_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_progresso_aula_dominio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area_id uuid;
BEGIN
  SELECT m.area_id INTO v_area_id
  FROM public.aprender_aulas au
  JOIN public.aprender_modulos m ON m.id = au.modulo_id
  WHERE au.id = COALESCE(NEW.aula_id, OLD.aula_id);

  IF v_area_id IS NOT NULL THEN
    PERFORM public.recalcular_dominio_area(COALESCE(NEW.user_id, OLD.user_id), v_area_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aprender_progresso_aula_dominio ON public.aprender_progresso_aula;
CREATE TRIGGER trg_aprender_progresso_aula_dominio
AFTER INSERT OR UPDATE ON public.aprender_progresso_aula
FOR EACH ROW EXECUTE FUNCTION public.trg_progresso_aula_dominio();

-- Função utilitária: streak diário do usuário (dias consecutivos com pelo menos 1 bloco concluído)
CREATE OR REPLACE FUNCTION public.aprender_streak_atual(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak int := 0;
  v_dia date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_existe boolean;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.aprender_progresso_bloco
      WHERE user_id = p_user_id
        AND (updated_at AT TIME ZONE 'America/Sao_Paulo')::date = v_dia
    ) INTO v_existe;

    IF v_existe THEN
      v_streak := v_streak + 1;
      v_dia := v_dia - INTERVAL '1 day';
    ELSE
      -- se hoje ainda não estudou, tenta ontem sem quebrar streak
      IF v_streak = 0 AND v_dia = (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
        v_dia := v_dia - INTERVAL '1 day';
        CONTINUE;
      END IF;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprender_streak_atual(uuid) TO authenticated;
