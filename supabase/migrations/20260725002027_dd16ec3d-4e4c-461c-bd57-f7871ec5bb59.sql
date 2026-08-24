
-- Create biblioteca_oratoria (mirror of biblioteca_fora_da_toga)
CREATE TABLE public.biblioteca_oratoria (
  id BIGSERIAL PRIMARY KEY,
  livro TEXT,
  autor TEXT,
  area TEXT,
  capa_livro TEXT,
  sobre TEXT,
  link TEXT,
  download TEXT,
  capa_horizontal TEXT,
  ano_lancamento TEXT,
  editora TEXT,
  curiosidades JSONB,
  analise_detalhada TEXT,
  ordem INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.biblioteca_oratoria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_oratoria TO authenticated;
GRANT ALL ON public.biblioteca_oratoria TO service_role;

ALTER TABLE public.biblioteca_oratoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biblioteca_oratoria leitura publica"
  ON public.biblioteca_oratoria FOR SELECT
  USING (true);

CREATE TRIGGER update_biblioteca_oratoria_updated_at
  BEFORE UPDATE ON public.biblioteca_oratoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Copy the 3 oratory books from fora da toga
INSERT INTO public.biblioteca_oratoria
  (livro, autor, area, capa_livro, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada)
SELECT
  livro, autor, 'Oratória e Persuasão', capa_livro, sobre, link, download, capa_horizontal, ano_lancamento, editora, curiosidades, analise_detalhada
FROM public.biblioteca_fora_da_toga
WHERE id IN (470, 484, 505);

-- Remove them from the origin table
DELETE FROM public.biblioteca_fora_da_toga WHERE id IN (470, 484, 505);
