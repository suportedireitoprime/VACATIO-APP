
ALTER TABLE public.horus_whatsapp_users ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.horus_whatsapp_users
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS msg_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_user_id uuid,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_state text NOT NULL DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS contexto_resumo text;

CREATE UNIQUE INDEX IF NOT EXISTS horus_whatsapp_users_phone_uidx
  ON public.horus_whatsapp_users (phone_e164);

ALTER TABLE public.horus_conversations
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS intent_confianca numeric;

CREATE INDEX IF NOT EXISTS horus_conversations_phone_created_idx
  ON public.horus_conversations (phone_e164, created_at DESC);

ALTER TABLE public.horus_funcoes
  ADD COLUMN IF NOT EXISTS prioridade integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS requer_cadastro boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS modelo text NOT NULL DEFAULT 'gemini-flash-latest',
  ADD COLUMN IF NOT EXISTS temperatura numeric NOT NULL DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS max_tokens integer NOT NULL DEFAULT 800,
  ADD COLUMN IF NOT EXISTS ferramentas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS eh_onboarding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eh_fallback boolean NOT NULL DEFAULT false;

INSERT INTO public.horus_whatsapp_users (phone_e164, first_seen_at, last_seen_at, msg_count)
SELECT c.phone_e164, MIN(c.created_at), MAX(c.created_at), COUNT(*)::int
FROM public.horus_conversations c
WHERE c.phone_e164 IS NOT NULL
GROUP BY c.phone_e164
ON CONFLICT (phone_e164) DO UPDATE
SET last_seen_at = GREATEST(public.horus_whatsapp_users.last_seen_at, EXCLUDED.last_seen_at),
    msg_count = GREATEST(public.horus_whatsapp_users.msg_count, EXCLUDED.msg_count),
    first_seen_at = LEAST(COALESCE(public.horus_whatsapp_users.first_seen_at, EXCLUDED.first_seen_at), EXCLUDED.first_seen_at);

UPDATE public.horus_whatsapp_users hwu
SET linked_user_id = p.id,
    linked_at = COALESCE(hwu.linked_at, now()),
    onboarding_state = 'ativo',
    display_name = COALESCE(hwu.display_name, p.display_name)
FROM public.profiles p
WHERE hwu.linked_user_id IS NULL
  AND p.telefone IS NOT NULL
  AND regexp_replace(p.telefone, '\D', '', 'g') = regexp_replace(hwu.phone_e164, '\D', '', 'g');

INSERT INTO public.horus_funcoes (nome, descricao, prompt, keywords, ativo, prioridade, requer_cadastro, eh_onboarding, ordem)
SELECT
  'Onboarding',
  'Recebe pessoas que ainda não têm o app instalado ou o número não vinculado. Envia link da Play Store e orienta o cadastro sem executar tarefas jurídicas.',
  'Você é o Horus, assistente jurídico do app Vade Mecum, falando pelo WhatsApp com uma pessoa cujo número AINDA NÃO está cadastrado no app.

REGRAS:
- Seja natural, caloroso e curto (máx 3 linhas por mensagem).
- Nunca responda perguntas jurídicas (artigos, leis, jurisprudência, dúvidas do concurso). Explique gentilmente que só respondo perguntas jurídicas depois que a pessoa baixar o app e cadastrar este número no perfil.
- Envie o link https://play.google.com/store/apps/details?id=br.com.vacatio.legis ao menos uma vez.
- Se a pessoa insistir num tema jurídico, mostre empatia (ótima pergunta!) e reforce que o app libera essa resposta.
- Use o nome dela se souber. Não repita Olá, eu sou o Horus em toda mensagem — apresente-se apenas na primeira interação.
- Conclua sempre convidando: Depois de instalar, é só cadastrar este número no seu perfil que eu já respondo tudo por aqui.',
  ARRAY['onboarding','cadastro','instalar','baixar','app','loja','play']::text[],
  true, 1, false, true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.horus_funcoes WHERE lower(nome) = 'onboarding');

UPDATE public.horus_funcoes SET eh_onboarding = true, requer_cadastro = false, prioridade = 1
WHERE lower(nome) = 'onboarding';

INSERT INTO public.horus_funcoes (nome, descricao, prompt, keywords, ativo, prioridade, requer_cadastro, eh_fallback, ordem)
SELECT
  'Conversa Livre',
  'Fallback amigável quando nenhum outro agente casa com a intenção da mensagem.',
  'Você é o Horus, assistente jurídico do app Vade Mecum no WhatsApp. Converse de forma natural, breve e útil. Se o pedido for jurídico, responda com precisão citando artigos e leis quando pertinente. Nunca repita apresentações; siga o fio da conversa.',
  ARRAY[]::text[], true, 999, true, true, 999
WHERE NOT EXISTS (SELECT 1 FROM public.horus_funcoes WHERE lower(nome) = 'conversa livre');

UPDATE public.horus_funcoes SET eh_fallback = true, prioridade = 999
WHERE lower(nome) = 'conversa livre';
