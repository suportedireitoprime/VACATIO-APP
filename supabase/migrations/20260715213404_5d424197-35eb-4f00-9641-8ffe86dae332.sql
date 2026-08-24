
CREATE TABLE public.tematica_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  obra_id uuid NOT NULL REFERENCES public.tematica_juridica_obras(id) ON DELETE CASCADE,
  texto text NOT NULL,
  elogio boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tematica_comentarios TO authenticated;
GRANT ALL ON public.tematica_comentarios TO service_role;
ALTER TABLE public.tematica_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comentários visíveis a autenticados"
  ON public.tematica_comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário cria seus comentários"
  ON public.tematica_comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário edita seus comentários"
  ON public.tematica_comentarios FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário apaga seus comentários"
  ON public.tematica_comentarios FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX tematica_comentarios_obra_idx ON public.tematica_comentarios(obra_id, created_at DESC);

CREATE TABLE public.tematica_favoritos (
  user_id uuid NOT NULL,
  obra_id uuid NOT NULL REFERENCES public.tematica_juridica_obras(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, obra_id)
);
GRANT SELECT, INSERT, DELETE ON public.tematica_favoritos TO authenticated;
GRANT ALL ON public.tematica_favoritos TO service_role;
ALTER TABLE public.tematica_favoritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia seus favoritos"
  ON public.tematica_favoritos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tematica_watchlist (
  user_id uuid NOT NULL,
  obra_id uuid NOT NULL REFERENCES public.tematica_juridica_obras(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, obra_id)
);
GRANT SELECT, INSERT, DELETE ON public.tematica_watchlist TO authenticated;
GRANT ALL ON public.tematica_watchlist TO service_role;
ALTER TABLE public.tematica_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia sua watchlist"
  ON public.tematica_watchlist FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
