WITH ranked_notes AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, tabela_codigo, numero_artigo, lower(btrim(anotacao))
           ORDER BY created_at ASC, id ASC
         ) AS duplicate_rank
  FROM public.artigos_anotacoes
  WHERE anotacao IS NOT NULL
    AND btrim(anotacao) <> ''
)
DELETE FROM public.artigos_anotacoes AS notes
USING ranked_notes AS ranked
WHERE notes.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS artigos_anotacoes_unique_text_per_article_idx
  ON public.artigos_anotacoes (
    user_id,
    tabela_codigo,
    numero_artigo,
    lower(btrim(anotacao))
  )
  WHERE anotacao IS NOT NULL
    AND btrim(anotacao) <> '';