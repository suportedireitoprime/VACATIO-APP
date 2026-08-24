-- Tables are empty, safe to alter id type
ALTER TABLE public.biblioteca_classicos DROP CONSTRAINT IF EXISTS biblioteca_classicos_pkey;
ALTER TABLE public.biblioteca_classicos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.biblioteca_classicos ALTER COLUMN id TYPE bigint USING NULL;
ALTER TABLE public.biblioteca_classicos ADD PRIMARY KEY (id);

ALTER TABLE public.biblioteca_estudos DROP CONSTRAINT IF EXISTS biblioteca_estudos_pkey;
ALTER TABLE public.biblioteca_estudos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.biblioteca_estudos ALTER COLUMN id TYPE bigint USING NULL;
ALTER TABLE public.biblioteca_estudos ADD PRIMARY KEY (id);

ALTER TABLE public.biblioteca_fora_da_toga DROP CONSTRAINT IF EXISTS biblioteca_fora_da_toga_pkey;
ALTER TABLE public.biblioteca_fora_da_toga ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.biblioteca_fora_da_toga ALTER COLUMN id TYPE bigint USING NULL;
ALTER TABLE public.biblioteca_fora_da_toga ADD PRIMARY KEY (id);

ALTER TABLE public.biblioteca_lideranca DROP CONSTRAINT IF EXISTS biblioteca_lideranca_pkey;
ALTER TABLE public.biblioteca_lideranca ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.biblioteca_lideranca ALTER COLUMN id TYPE bigint USING NULL;
ALTER TABLE public.biblioteca_lideranca ADD PRIMARY KEY (id);