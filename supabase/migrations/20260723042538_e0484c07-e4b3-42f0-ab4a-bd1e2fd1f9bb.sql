
-- Uniques para permitir upsert de progresso do Aprender
ALTER TABLE public.aprender_progresso_aula
  ADD CONSTRAINT aprender_progresso_aula_user_aula_uniq UNIQUE (user_id, aula_id);

ALTER TABLE public.aprender_progresso_bloco
  ADD CONSTRAINT aprender_progresso_bloco_user_bloco_uniq UNIQUE (user_id, bloco_id);
