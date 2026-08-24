
-- 1) Adiciona coluna tipo em boletins_juridicos
ALTER TABLE public.boletins_juridicos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'juridico';

ALTER TABLE public.boletins_juridicos
  ADD CONSTRAINT boletins_juridicos_tipo_chk
  CHECK (tipo IN ('juridico','noticias'));

-- 2) Troca unique de data_ref por (data_ref, tipo)
ALTER TABLE public.boletins_juridicos
  DROP CONSTRAINT IF EXISTS boletins_juridicos_data_ref_key;

ALTER TABLE public.boletins_juridicos
  ADD CONSTRAINT boletins_juridicos_data_ref_tipo_key UNIQUE (data_ref, tipo);

-- 3) Extende boletim_config com config específica de notícias
ALTER TABLE public.boletim_config
  ADD COLUMN IF NOT EXISTS noticias_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS noticias_horario time without time zone NOT NULL DEFAULT '07:00:00',
  ADD COLUMN IF NOT EXISTS noticias_voz_id text NOT NULL DEFAULT 'Kore',
  ADD COLUMN IF NOT EXISTS noticias_max_itens integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS noticias_prompt_tts_extra text NOT NULL DEFAULT 'Locutor de telejornal jurídico. Tom persuasivo e envolvente, com ritmo dinâmico de rádio. Ênfase em verbos fortes e nomes próprios. Voz clara, articulada.';

-- Grants (mantêm o que já existia)
GRANT SELECT ON public.boletins_juridicos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boletins_juridicos TO authenticated;
GRANT ALL ON public.boletins_juridicos TO service_role;
GRANT SELECT, UPDATE ON public.boletim_config TO authenticated;
GRANT ALL ON public.boletim_config TO service_role;
