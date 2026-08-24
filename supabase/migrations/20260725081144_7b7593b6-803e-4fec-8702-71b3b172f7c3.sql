CREATE POLICY "Somente o backend gerencia favoritos de sumulas"
ON public.sumulas_favoritos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);