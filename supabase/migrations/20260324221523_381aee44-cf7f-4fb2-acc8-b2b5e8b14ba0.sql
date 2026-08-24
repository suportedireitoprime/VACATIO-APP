CREATE TABLE IF NOT EXISTS LEIS_ORDINARIAS (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lei text NOT NULL,
  data_publicacao text,
  ementa text NOT NULL DEFAULT '',
  url text,
  ano integer NOT NULL,
  ordem integer NOT NULL DEFAULT 0
);

ALTER TABLE LEIS_ORDINARIAS ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública LEIS_ORD" ON LEIS_ORDINARIAS FOR SELECT TO public USING (true);
CREATE POLICY "Inserção LEIS_ORD" ON LEIS_ORDINARIAS FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção LEIS_ORD" ON LEIS_ORDINARIAS FOR DELETE TO public USING (true);

CREATE INDEX idx_leis_ordinarias_ano_ordem ON LEIS_ORDINARIAS (ano, ordem);