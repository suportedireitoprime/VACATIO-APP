ALTER TABLE public.vade_mecum_leis DROP CONSTRAINT vade_mecum_leis_categoria_check;
ALTER TABLE public.vade_mecum_leis ADD CONSTRAINT vade_mecum_leis_categoria_check
CHECK (categoria = ANY (ARRAY['codigo','estatuto','lei','sumula','constituicao','decreto','lei_complementar','medida_provisoria']) OR categoria LIKE 'estadual_%' OR categoria LIKE 'municipal_%');