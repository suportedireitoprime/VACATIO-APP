-- Grants faltando fazem PostgREST recusar leitura dessas tabelas
GRANT SELECT ON public.biblioteca_estudos TO anon, authenticated;
GRANT ALL ON public.biblioteca_estudos TO service_role;

GRANT SELECT ON public.biblioteca_leitura_nativa TO anon, authenticated;
GRANT ALL ON public.biblioteca_leitura_nativa TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprender_sumario_sugerido TO authenticated;
GRANT ALL ON public.aprender_sumario_sugerido TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aprender_aulas TO authenticated;
GRANT ALL ON public.aprender_aulas TO service_role;

-- Alinha allowlist da policy de sumário sugerido com o restante do app
DROP POLICY IF EXISTS "admins gerenciam sumario sugerido" ON public.aprender_sumario_sugerido;
CREATE POLICY "admins gerenciam sumario sugerido"
  ON public.aprender_sumario_sugerido
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = ANY (ARRAY[
        'wn7corporation@gmail.com',
        'suporte.vacatio@gmail.com',
        'wn7juridico@gmail.com'
      ])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = ANY (ARRAY[
        'wn7corporation@gmail.com',
        'suporte.vacatio@gmail.com',
        'wn7juridico@gmail.com'
      ])
  ));