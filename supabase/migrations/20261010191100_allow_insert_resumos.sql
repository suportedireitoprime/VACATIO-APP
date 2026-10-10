-- Permitir Inserção e Atualização na tabela resumos_juridicos
CREATE POLICY "Permitir Insert resumos" ON public.resumos_juridicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir Update resumos" ON public.resumos_juridicos FOR UPDATE TO authenticated USING (true);

-- Permitir Inserção e Atualização na tabela resumo_metodologias
CREATE POLICY "Permitir Insert metodologias" ON public.resumo_metodologias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir Update metodologias" ON public.resumo_metodologias FOR UPDATE TO authenticated USING (true);
