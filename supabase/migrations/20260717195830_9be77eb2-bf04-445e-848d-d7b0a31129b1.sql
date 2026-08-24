CREATE TABLE public.horus_qr_cache (
  instance_name text PRIMARY KEY,
  qrcode text,
  code text,
  event_name text,
  status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 minutes'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.horus_qr_cache TO service_role;

ALTER TABLE public.horus_qr_cache ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_horus_qr_cache_updated_at
BEFORE UPDATE ON public.horus_qr_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();