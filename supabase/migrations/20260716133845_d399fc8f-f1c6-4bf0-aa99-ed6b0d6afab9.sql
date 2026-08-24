DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'biblioteca_classicos',
    'biblioteca_estudos',
    'biblioteca_fora_da_toga',
    'biblioteca_lideranca',
    'biblioteca_oab',
    'biblioteca_pesquisa_cientifica',
    'biblioteca_portugues'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS capa_horizontal text,
      ADD COLUMN IF NOT EXISTS ano_lancamento text,
      ADD COLUMN IF NOT EXISTS editora text,
      ADD COLUMN IF NOT EXISTS curiosidades jsonb,
      ADD COLUMN IF NOT EXISTS analise_detalhada text', t);
  END LOOP;
END $$;