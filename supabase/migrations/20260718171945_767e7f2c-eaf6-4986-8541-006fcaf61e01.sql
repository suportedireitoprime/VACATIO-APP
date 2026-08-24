
ALTER TABLE public.blog_edicao_posts
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS audio_voice text,
  ADD COLUMN IF NOT EXISTS audio_model text,
  ADD COLUMN IF NOT EXISTS audio_cost_credits numeric(10,4),
  ADD COLUMN IF NOT EXISTS audio_generated_at timestamptz;

ALTER TABLE public.blog_edicao_config
  ADD COLUMN IF NOT EXISTS narracao_voz text DEFAULT 'alloy',
  ADD COLUMN IF NOT EXISTS narracao_modelo text DEFAULT 'openai/gpt-4o-mini-tts',
  ADD COLUMN IF NOT EXISTS narracao_estilo text DEFAULT 'Narração entusiasmada, curiosa e informativa. Tom que engaja o ouvinte como um contador de histórias jurídicas: ritmo natural, pausas leves, ênfase nas descobertas. Português do Brasil.',
  ADD COLUMN IF NOT EXISTS narracao_amostra text DEFAULT 'Você sabia que a Constituição de 1988 é chamada de Constituição Cidadã justamente por ter nascido de uma das assembleias mais participativas da história do Brasil? Cada artigo dela carrega décadas de conquistas — e ainda molda o seu dia a dia agora, enquanto você me escuta.';
