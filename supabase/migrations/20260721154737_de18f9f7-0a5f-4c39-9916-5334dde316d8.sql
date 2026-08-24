UPDATE public.horus_whatsapp_users SET phone_e164 = regexp_replace(phone_e164, '\D', '', 'g') WHERE phone_e164 LIKE '+%';
UPDATE public.horus_verification_codes SET phone_e164 = regexp_replace(phone_e164, '\D', '', 'g') WHERE phone_e164 LIKE '+%';
UPDATE public.horus_phone_transfers SET phone_e164 = regexp_replace(phone_e164, '\D', '', 'g') WHERE phone_e164 LIKE '+%';