ALTER TABLE public.artigos_anotacoes
  DROP CONSTRAINT IF EXISTS artigos_anotacoes_user_id_tabela_codigo_numero_artigo_key;

CREATE INDEX IF NOT EXISTS artigos_anotacoes_user_artigo_idx
  ON public.artigos_anotacoes (user_id, tabela_codigo, numero_artigo);