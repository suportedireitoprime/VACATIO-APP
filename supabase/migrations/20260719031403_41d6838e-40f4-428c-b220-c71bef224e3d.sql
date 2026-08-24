-- Remove duplicata do admin (mantém a versão com '+')
DELETE FROM public.horus_whatsapp_users a
USING public.horus_whatsapp_users b
WHERE a.ctid <> b.ctid
  AND regexp_replace(a.phone_e164, '\D', '', 'g') = regexp_replace(b.phone_e164, '\D', '', 'g')
  AND (a.phone_e164 !~ '^\+' AND b.phone_e164 ~ '^\+');

-- Índice único para impedir novas duplicatas por número normalizado
CREATE UNIQUE INDEX IF NOT EXISTS horus_whatsapp_users_phone_digits_uidx
  ON public.horus_whatsapp_users ((regexp_replace(phone_e164, '\D', '', 'g')));
