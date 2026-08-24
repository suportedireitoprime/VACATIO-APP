UPDATE public.horus_whatsapp_users
SET linked_user_id = user_id,
    linked_at = COALESCE(linked_at, verified_at, now()),
    onboarding_state = CASE WHEN onboarding_state IN ('novo','code_sent','verified') THEN 'ativo' ELSE onboarding_state END
WHERE linked_user_id IS NULL AND user_id IS NOT NULL AND verified_at IS NOT NULL;

UPDATE public.profiles p
SET telefone = h.phone_e164
FROM public.horus_whatsapp_users h
WHERE h.user_id = p.id
  AND h.verified_at IS NOT NULL
  AND (p.telefone IS NULL OR regexp_replace(coalesce(p.telefone,''), '\D','','g') <> regexp_replace(h.phone_e164,'\D','','g'));