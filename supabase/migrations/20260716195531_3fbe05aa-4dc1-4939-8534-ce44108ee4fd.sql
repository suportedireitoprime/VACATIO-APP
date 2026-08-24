
CREATE TABLE public.hero_home_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  prompt_used text,
  storage_path text NOT NULL,
  imagem_url text NOT NULL,
  animation_preset text NOT NULL DEFAULT 'ken-burns',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.hero_home_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_home_images TO authenticated;
GRANT ALL ON public.hero_home_images TO service_role;

ALTER TABLE public.hero_home_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active hero images"
  ON public.hero_home_images FOR SELECT
  USING (ativo = true OR public.is_admin_user(auth.uid()));

CREATE POLICY "Only admin can insert hero images"
  ON public.hero_home_images FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Only admin can update hero images"
  ON public.hero_home_images FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Only admin can delete hero images"
  ON public.hero_home_images FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX hero_home_images_ativo_ordem_idx ON public.hero_home_images (ativo, ordem);

CREATE TRIGGER hero_home_images_updated_at
  BEFORE UPDATE ON public.hero_home_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for hero-home bucket
CREATE POLICY "Admin can manage hero-home objects"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'hero-home' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'hero-home' AND public.is_admin_user(auth.uid()));

CREATE POLICY "Anyone can read hero-home objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-home');
