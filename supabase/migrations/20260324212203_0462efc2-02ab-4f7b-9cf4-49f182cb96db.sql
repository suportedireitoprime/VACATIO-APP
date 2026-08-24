
CREATE TABLE public."CF88_CONSTITUICAO_FEDERAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  rotulo text,
  texto text NOT NULL DEFAULT '',
  caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text,
  capitulo text,
  incisos text[] DEFAULT '{}',
  paragrafos text[] DEFAULT '{}'
);

ALTER TABLE public."CF88_CONSTITUICAO_FEDERAL" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública CF88" ON public."CF88_CONSTITUICAO_FEDERAL" FOR SELECT USING (true);
CREATE POLICY "Inserção CF88" ON public."CF88_CONSTITUICAO_FEDERAL" FOR INSERT WITH CHECK (true);
CREATE POLICY "Deleção CF88" ON public."CF88_CONSTITUICAO_FEDERAL" FOR DELETE USING (true);

CREATE INDEX idx_cf88_ordem_numero ON public."CF88_CONSTITUICAO_FEDERAL" (ordem_numero);
