
create or replace function public.increment_geracao_processadas()
returns void
language sql
security definer
set search_path = public
as $$
  update geracao_global
  set total_processadas = total_processadas + 1,
      updated_at = now();
$$;

create or replace function public.increment_geracao_erros()
returns void
language sql
security definer
set search_path = public
as $$
  update geracao_global
  set total_erros = total_erros + 1,
      updated_at = now();
$$;
