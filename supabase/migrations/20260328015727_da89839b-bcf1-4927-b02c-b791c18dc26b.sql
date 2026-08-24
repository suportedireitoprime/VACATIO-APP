CREATE TABLE public.narracoes_artigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  lei_nome text NOT NULL,
  titulo_artigo text,
  audio_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tabela_nome, artigo_numero)
);

ALTER TABLE public.narracoes_artigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública" ON public.narracoes_artigos FOR SELECT USING (true);
CREATE POLICY "Insert público" ON public.narracoes_artigos FOR INSERT WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('narracoes', 'narracoes', true);

CREATE POLICY "Public read narracoes" ON storage.objects FOR SELECT USING (bucket_id = 'narracoes');
CREATE POLICY "Public insert narracoes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'narracoes');