ALTER TABLE public.radar_ranking 
  ADD COLUMN IF NOT EXISTS total_discursos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orgaos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_frentes integer DEFAULT 0;