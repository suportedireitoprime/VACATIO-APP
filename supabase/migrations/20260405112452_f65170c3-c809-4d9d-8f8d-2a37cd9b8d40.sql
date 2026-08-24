
CREATE TABLE public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  display_name text,
  current_route text,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_last_seen ON user_activity_log (last_seen_at DESC);
CREATE UNIQUE INDEX idx_activity_user ON user_activity_log (user_id);

ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read activity" ON user_activity_log
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can upsert own activity" ON user_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity" ON user_activity_log
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
