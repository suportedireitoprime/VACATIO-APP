-- Narração de Conteúdo (admin): prévias de voz + narrações por página de livro

CREATE TABLE public.narracao_vozes_preview (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voz text NOT NULL,
  estilo text NOT NULL DEFAULT '',
  texto text NOT NULL,
  texto_hash text NOT NULL,
  audio_path text,
  audio_url text,
  duracao_segundos integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX narracao_vozes_preview_uniq ON public.narracao_vozes_preview (voz, texto_hash);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.narracao_vozes_preview TO authenticated;
GRANT ALL ON public.narracao_vozes_preview TO service_role;

ALTER TABLE public.narracao_vozes_preview ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins gerenciam previews de voz"
  ON public.narracao_vozes_preview FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TABLE public.narracao_livro_paginas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  livro_tabela text NOT NULL,
  livro_id text NOT NULL,
  pagina_index integer NOT NULL,
  pagina_label text,
  voz text NOT NULL,
  modelo text,
  estilo text,
  texto_hash text,
  caracteres integer,
  audio_path text,
  audio_url text,
  duracao_segundos integer,
  status text NOT NULL DEFAULT 'pronto',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX narracao_livro_paginas_uniq
  ON public.narracao_livro_paginas (livro_tabela, livro_id, pagina_index);
CREATE INDEX narracao_livro_paginas_livro_idx
  ON public.narracao_livro_paginas (livro_tabela, livro_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.narracao_livro_paginas TO authenticated;
GRANT SELECT ON public.narracao_livro_paginas TO anon;
GRANT ALL ON public.narracao_livro_paginas TO service_role;

ALTER TABLE public.narracao_livro_paginas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos leem narracoes de livro"
  ON public.narracao_livro_paginas FOR SELECT
  USING (true);

CREATE POLICY "admins gerenciam narracoes de livro"
  ON public.narracao_livro_paginas FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.narracao_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER narracao_vozes_preview_updated
  BEFORE UPDATE ON public.narracao_vozes_preview
  FOR EACH ROW EXECUTE FUNCTION public.narracao_set_updated_at();

CREATE TRIGGER narracao_livro_paginas_updated
  BEFORE UPDATE ON public.narracao_livro_paginas
  FOR EACH ROW EXECUTE FUNCTION public.narracao_set_updated_at();