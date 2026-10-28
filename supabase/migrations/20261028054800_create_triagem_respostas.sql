-- Tabela para registrar todas as respostas completas de triagem dos usuários
CREATE TABLE IF NOT EXISTS public.triagem_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  categoria text NOT NULL, -- 'faculdade', 'concurso', 'advogado', 'professor'
  genero text, -- 'm' | 'f' | 'unissex'
  persona_label text, -- 'Estudante', 'Advogado', 'Advogada', 'Professor', 'Professora', 'Concurseiro', 'Concurseira'
  faixa_etaria text, -- '18 a 24 anos', etc.
  dor_id text,
  dor_label text,
  dor_solucao text,
  interesses text[],
  areas_interesse text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_triagem_respostas_user_id ON public.triagem_respostas(user_id);
CREATE INDEX IF NOT EXISTS idx_triagem_respostas_created_at ON public.triagem_respostas(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.triagem_respostas ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can insert own triagem" ON public.triagem_respostas;
CREATE POLICY "Users can insert own triagem"
  ON public.triagem_respostas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own triagem" ON public.triagem_respostas;
CREATE POLICY "Users can read own triagem"
  ON public.triagem_respostas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all triagens" ON public.triagem_respostas;
CREATE POLICY "Admins can view all triagens"
  ON public.triagem_respostas FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Também adicionamos coluna genero_perfil na tabela profiles se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS genero_perfil text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS categoria_perfil text;
