
create table public.geracao_global (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'idle',
  modos text[] not null default '{"explicacao","exemplo","termos","sugerir_perguntas"}',
  total_pendentes int not null default 0,
  total_processadas int not null default 0,
  total_erros int not null default 0,
  current_tabela text,
  current_artigo text,
  current_modo text,
  started_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.geracao_global enable row level security;

create policy "Anyone can read geracao_global"
  on public.geracao_global for select
  to authenticated
  using (true);

insert into public.geracao_global (id) values (gen_random_uuid());
