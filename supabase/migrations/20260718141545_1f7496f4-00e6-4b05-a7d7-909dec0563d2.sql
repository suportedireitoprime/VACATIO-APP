ALTER TABLE public.horus_conversations
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS tokens_in integer,
  ADD COLUMN IF NOT EXISTS tokens_out integer,
  ADD COLUMN IF NOT EXISTS tokens_total integer,
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,6),
  ADD COLUMN IF NOT EXISTS tools_used text[],
  ADD COLUMN IF NOT EXISTS model text;