-- Fix broken image references: compression converted .png → .webp but DB still has .png paths
UPDATE biblioteca_estudos 
SET capa_livro = regexp_replace(capa_livro, '\.png$', '.webp')
WHERE capa_livro LIKE '%.png';

UPDATE biblioteca_fora_da_toga
SET capa_livro = regexp_replace(capa_livro, '\.png$', '.webp')
WHERE capa_livro LIKE '%.png';