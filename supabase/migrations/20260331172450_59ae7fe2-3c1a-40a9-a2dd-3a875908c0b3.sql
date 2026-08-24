ALTER TABLE simulados
  ADD COLUMN IF NOT EXISTS ocr_prova_text text,
  ADD COLUMN IF NOT EXISTS ocr_gabarito_text text,
  ADD COLUMN IF NOT EXISTS questao_offset integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imagem_urls jsonb DEFAULT '{}';