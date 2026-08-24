ALTER TABLE public.radar_proposicoes ADD COLUMN IF NOT EXISTS url_inteiro_teor text;
DELETE FROM public.radar_pl_headlines;