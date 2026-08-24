
CREATE TABLE public.biblioteca_pdf_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  livro_id BIGINT,
  livro_titulo TEXT,
  url TEXT NOT NULL,
  event TEXT NOT NULL,
  duration_ms INTEGER,
  total_pages INTEGER,
  error_message TEXT,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.biblioteca_pdf_telemetry TO authenticated;
GRANT ALL ON public.biblioteca_pdf_telemetry TO service_role;

ALTER TABLE public.biblioteca_pdf_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own insert pdf telemetry"
  ON public.biblioteca_pdf_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "own select pdf telemetry"
  ON public.biblioteca_pdf_telemetry FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_pdf_telemetry_url ON public.biblioteca_pdf_telemetry(url);
CREATE INDEX idx_pdf_telemetry_event ON public.biblioteca_pdf_telemetry(event);
CREATE INDEX idx_pdf_telemetry_created ON public.biblioteca_pdf_telemetry(created_at DESC);
