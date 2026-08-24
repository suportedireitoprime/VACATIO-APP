
ALTER TABLE public.horus_conversations DROP COLUMN IF EXISTS off_topic_streak;
ALTER TABLE public.horus_whatsapp_users ADD COLUMN IF NOT EXISTS off_topic_streak int NOT NULL DEFAULT 0;
