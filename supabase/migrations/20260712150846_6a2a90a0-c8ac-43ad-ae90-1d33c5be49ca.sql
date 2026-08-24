ALTER TABLE public.vade_mecum_artigos
  ADD COLUMN IF NOT EXISTS alteracoes jsonb,
  ADD COLUMN IF NOT EXISTS epigrafe text,
  ADD COLUMN IF NOT EXISTS comentario text,
  ADD COLUMN IF NOT EXISTS exemplo text,
  ADD COLUMN IF NOT EXISTS explicacao_tecnico text,
  ADD COLUMN IF NOT EXISTS explicacao_resumido text,
  ADD COLUMN IF NOT EXISTS explicacao_simples_maior16 text,
  ADD COLUMN IF NOT EXISTS explicacao_simples_menor16 text,
  ADD COLUMN IF NOT EXISTS flashcards jsonb,
  ADD COLUMN IF NOT EXISTS questoes jsonb,
  ADD COLUMN IF NOT EXISTS termos jsonb,
  ADD COLUMN IF NOT EXISTS narracao_url text,
  ADD COLUMN IF NOT EXISTS planalto_url text;