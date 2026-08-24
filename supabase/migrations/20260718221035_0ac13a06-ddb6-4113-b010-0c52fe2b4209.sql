ALTER TABLE public.vade_mecum_leis ADD COLUMN IF NOT EXISTS ementa TEXT;

UPDATE public.vade_mecum_leis
SET ementa = 'Institui a Lei Orgânica Nacional do Ministério Público, dispõe sobre normas gerais para a organização do Ministério Público dos Estados e dá outras providências.'
WHERE slug = 'lomp';