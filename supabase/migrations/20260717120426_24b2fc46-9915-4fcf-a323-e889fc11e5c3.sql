
CREATE TABLE public.gcp_monitor_cache (
  bucket text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gcp_monitor_cache TO authenticated;
GRANT ALL ON public.gcp_monitor_cache TO service_role;

ALTER TABLE public.gcp_monitor_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler cache GCP"
ON public.gcp_monitor_cache
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));
