ALTER TABLE public.geracao_global
  ADD COLUMN IF NOT EXISTS cooldown_until timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cursor_tabela_idx integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cursor_modo_idx integer NOT NULL DEFAULT 0;