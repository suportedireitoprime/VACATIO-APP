DROP POLICY IF EXISTS "Permitir atualizacao de narracao" ON public.vade_mecum_artigos;
CREATE POLICY "Permitir atualizacao de narracao" ON public.vade_mecum_artigos FOR UPDATE USING (true) WITH CHECK (true);
