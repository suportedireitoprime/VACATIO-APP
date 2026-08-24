CREATE POLICY "Anyone can update AI cache"
ON public.artigo_ai_cache
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);