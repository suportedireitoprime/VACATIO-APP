ALTER TABLE public.biblioteca_livros 
  ADD COLUMN IF NOT EXISTS estrutura_leitura jsonb,
  ADD COLUMN IF NOT EXISTS versao_processamento integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS erro_detalhe text;