
ALTER TABLE public.horus_whatsapp_users ADD COLUMN IF NOT EXISTS apelido text;
ALTER TABLE public.horus_whatsapp_users ADD COLUMN IF NOT EXISTS apelido_ativo boolean NOT NULL DEFAULT false;

-- Backfill: onde nome_preferido do Horus diverge do display_name do cadastro,
-- preserva o valor atual como apelido (ativo) e sincroniza nome_preferido com o cadastro.
UPDATE public.horus_whatsapp_users h
SET apelido = h.nome_preferido,
    apelido_ativo = true
FROM public.profiles p
WHERE h.user_id = p.id
  AND h.apelido IS NULL
  AND h.nome_preferido IS NOT NULL
  AND trim(h.nome_preferido) <> ''
  AND trim(coalesce(p.display_name,'')) <> ''
  AND trim(lower(h.nome_preferido)) <> trim(lower(p.display_name));

UPDATE public.horus_whatsapp_users h
SET nome_preferido = p.display_name
FROM public.profiles p
WHERE h.user_id = p.id
  AND trim(coalesce(p.display_name,'')) <> ''
  AND trim(coalesce(h.nome_preferido,'')) <> trim(coalesce(p.display_name,''));

UPDATE public.horus_user_stats s
SET nome_preferido = p.display_name
FROM public.profiles p
WHERE s.user_id = p.id
  AND trim(coalesce(p.display_name,'')) <> ''
  AND trim(coalesce(s.nome_preferido,'')) <> trim(coalesce(p.display_name,''));
