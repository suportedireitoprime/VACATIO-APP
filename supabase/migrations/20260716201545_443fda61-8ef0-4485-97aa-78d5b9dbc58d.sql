
-- Tabela de curiosidades da home (mural leve, não clicável)
CREATE TABLE public.home_curiosidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto text NOT NULL,
  cor text NOT NULL DEFAULT '#FACC15',
  imagem_url text,
  imagem_path text,
  prompt_imagem text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.home_curiosidades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_curiosidades TO authenticated;
GRANT ALL ON public.home_curiosidades TO service_role;

ALTER TABLE public.home_curiosidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "curiosidades leitura publica ativa"
  ON public.home_curiosidades FOR SELECT
  TO anon, authenticated
  USING (ativo = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "curiosidades admin insert"
  ON public.home_curiosidades FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "curiosidades admin update"
  ON public.home_curiosidades FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "curiosidades admin delete"
  ON public.home_curiosidades FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX home_curiosidades_ativo_ordem_idx
  ON public.home_curiosidades (ativo, ordem);

CREATE TRIGGER update_home_curiosidades_updated_at
  BEFORE UPDATE ON public.home_curiosidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies do bucket 'home-curiosidades' (bucket criado via tool)
CREATE POLICY "curiosidades bucket admin all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'home-curiosidades' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'home-curiosidades' AND public.is_admin_user(auth.uid()));
