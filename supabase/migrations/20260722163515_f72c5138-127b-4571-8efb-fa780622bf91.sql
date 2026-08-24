
CREATE TABLE public.store_setup_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store text NOT NULL CHECK (store IN ('apple','google')),
  step_key text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store, step_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_setup_progress TO authenticated;
GRANT ALL ON public.store_setup_progress TO service_role;

ALTER TABLE public.store_setup_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own store setup progress"
  ON public.store_setup_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
