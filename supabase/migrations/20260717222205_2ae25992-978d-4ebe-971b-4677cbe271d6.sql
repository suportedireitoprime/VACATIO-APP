
ALTER TABLE public.boletim_config
  ADD COLUMN IF NOT EXISTS github_repo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS github_ref text NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS enviar_push boolean NOT NULL DEFAULT true;

INSERT INTO public.push_automations (key, nome, descricao, enabled, audience, emoji, cooldown_minutos)
VALUES (
  'boletim_juridico_diario',
  'Boletim Jurídico Diário',
  'Envia push com o boletim jurídico em vídeo assim que a versão do dia é gerada.',
  true,
  '{"tipo":"todos"}'::jsonb,
  '🎬',
  60
)
ON CONFLICT (key) DO NOTHING;
