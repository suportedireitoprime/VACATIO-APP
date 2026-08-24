
UPDATE blog_edicao_posts
SET conteudo_md = regexp_replace(
  conteudo_md,
  E'^\\s*#{1,3}\\s+[^\\n]*Juiz\\s+Hércules[^\\n]*\\n+',
  '',
  'i'
)
WHERE id = 'edicao-ab28969a-6024-4d39-9294-612390df160d-1784246491262';
