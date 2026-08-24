WITH lei AS (
  SELECT id FROM public.vade_mecum_leis WHERE slug = 'lmi'
), chapter_rows AS (
  INSERT INTO public.vade_mecum_artigos (lei_id, numero, texto, ordem)
  SELECT lei.id, v.numero, v.texto, v.ordem
  FROM lei
  CROSS JOIN (VALUES
    ('CAPÍTULO I', 'CAPÍTULO I
DO CABIMENTO E DOS LEGITIMADOS', 1),
    ('CAPÍTULO II', 'CAPÍTULO II
DO PROCEDIMENTO', 5),
    ('CAPÍTULO III', 'CAPÍTULO III
DA DECISÃO E DOS SEUS EFEITOS', 10),
    ('CAPÍTULO IV', 'CAPÍTULO IV
DO MANDADO DE INJUNÇÃO COLETIVO E DISPOSIÇÕES FINAIS', 14)
  ) AS v(numero, texto, ordem)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.vade_mecum_artigos a
    WHERE a.lei_id = lei.id
      AND a.numero = v.numero
  )
  RETURNING id
)
UPDATE public.vade_mecum_artigos a
SET ordem = CASE
  WHEN a.numero = '1' THEN 2
  WHEN a.numero = '2' THEN 3
  WHEN a.numero = '3' THEN 4
  WHEN a.numero = '4' THEN 6
  WHEN a.numero = '5' THEN 7
  WHEN a.numero = '6' THEN 8
  WHEN a.numero = '7' THEN 9
  WHEN a.numero = '8' THEN 11
  WHEN a.numero = '9' THEN 12
  WHEN a.numero = '10' THEN 13
  WHEN a.numero = '11' THEN 15
  WHEN a.numero = '12' THEN 16
  WHEN a.numero = '13' THEN 17
  WHEN a.numero = '14' THEN 18
  WHEN a.numero = '15' THEN 19
  ELSE a.ordem
END
FROM lei
WHERE a.lei_id = lei.id
  AND a.numero ~ '^[0-9]+$';