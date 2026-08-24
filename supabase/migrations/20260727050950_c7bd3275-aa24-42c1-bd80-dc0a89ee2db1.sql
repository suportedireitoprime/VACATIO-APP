ALTER TABLE public.narracao_vozes_preview
  ADD CONSTRAINT narracao_vozes_preview_voz_hash_key UNIQUE (voz, texto_hash);

ALTER TABLE public.narracao_livro_paginas
  ADD CONSTRAINT narracao_livro_paginas_livro_pagina_key UNIQUE (livro_tabela, livro_id, pagina_index);