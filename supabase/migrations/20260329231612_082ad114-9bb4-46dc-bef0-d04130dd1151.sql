CREATE TABLE study_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tabela_nome, artigo_numero)
);
ALTER TABLE study_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read study_questions" ON study_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert study_questions" ON study_questions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE study_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tabela_nome, artigo_numero)
);
ALTER TABLE study_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read study_flashcards" ON study_flashcards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert study_flashcards" ON study_flashcards FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tabela_nome text NOT NULL,
  artigo_numero text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('questoes', 'flashcards')),
  total integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sessions" ON study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE study_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  question_index integer NOT NULL,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE study_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own answers" ON study_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM study_sessions WHERE study_sessions.id = study_answers.session_id AND study_sessions.user_id = auth.uid()));
CREATE POLICY "Users insert own answers" ON study_answers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM study_sessions WHERE study_sessions.id = study_answers.session_id AND study_sessions.user_id = auth.uid()));