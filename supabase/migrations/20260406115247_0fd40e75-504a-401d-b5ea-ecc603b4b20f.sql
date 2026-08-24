
CREATE TABLE public.premium_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  ref_key text,
  used_at timestamptz DEFAULT now()
);

ALTER TABLE public.premium_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own usage" ON public.premium_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_premium_usage_user_month 
  ON public.premium_usage(user_id, feature, used_at);
