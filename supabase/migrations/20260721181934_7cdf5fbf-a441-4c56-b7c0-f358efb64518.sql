-- Limpa "nomes" que na verdade são áreas do direito ou palavras genéricas.
-- Registros afetados voltam a null para que os disparos usem apenas o primeiro nome real.
UPDATE public.horus_user_stats
SET nome_preferido = NULL
WHERE nome_preferido IS NOT NULL
  AND lower(regexp_replace(nome_preferido, '\s+', ' ', 'g')) ~ '^(direito|direito\s+.*|penal|civil|constitucional|trabalhista|tribut[aá]rio|administrativo|processual|empresarial|previdenci[aá]rio|estudante|aluno|usu[aá]rio|user|teste|test)(\s+.*)?$';

UPDATE public.horus_whatsapp_users
SET nome_preferido = NULL
WHERE nome_preferido IS NOT NULL
  AND lower(regexp_replace(nome_preferido, '\s+', ' ', 'g')) ~ '^(direito|direito\s+.*|penal|civil|constitucional|trabalhista|tribut[aá]rio|administrativo|processual|empresarial|previdenci[aá]rio|estudante|aluno|usu[aá]rio|user|teste|test)(\s+.*)?$';