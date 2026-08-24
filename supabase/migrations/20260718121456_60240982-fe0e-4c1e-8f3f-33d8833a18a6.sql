ALTER TABLE public.horus_funcoes ALTER COLUMN modelo SET DEFAULT 'gemini-2.5-flash-lite';
UPDATE public.horus_funcoes
   SET modelo = 'gemini-2.5-flash-lite'
 WHERE modelo IN ('gemini-flash-latest','gemini-flash-lite-latest','gemini-2.5-flash','gemini-2.5-pro')
    OR modelo LIKE 'gemini-3%'
    OR modelo LIKE '%-latest';