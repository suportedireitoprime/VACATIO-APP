-- Fix corrupted date for Motta article (year 5516 -> 2026)
UPDATE noticias_camara 
SET data_publicacao = '2026-03-25T21:00:00Z' 
WHERE id = 'a341a85b-bdd6-4267-a6dc-f9abad989cb9';

-- Fill missing images for articles that have empty imagem_url
UPDATE noticias_camara 
SET imagem_url = 'https://www.camara.leg.br/midias/image/2026/03/img20250328154617838-727x430.jpg'
WHERE id = '89c532af-2df1-4f44-829b-6aed3226785d' AND (imagem_url IS NULL OR imagem_url = '');