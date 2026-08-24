CREATE TABLE resenha_diaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ato text NOT NULL,
  numero_ato text NOT NULL,
  ementa text NOT NULL,
  url text NOT NULL UNIQUE,
  texto_completo text,
  data_publicacao text NOT NULL,
  data_dou date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resenha_diaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read resenha" ON resenha_diaria FOR SELECT USING (true);
CREATE POLICY "Insert resenha" ON resenha_diaria FOR INSERT WITH CHECK (true);
CREATE POLICY "Update resenha" ON resenha_diaria FOR UPDATE USING (true);

CREATE INDEX idx_resenha_data ON resenha_diaria(data_dou DESC);