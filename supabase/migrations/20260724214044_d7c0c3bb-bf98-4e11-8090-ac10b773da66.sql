
-- Cache compartilhado de desafios do Praticar
create table public.praticar_desafios_cache (
  artigo_id uuid primary key references public.vade_mecum_artigos(id) on delete cascade,
  versao_texto text not null,
  payload jsonb not null,
  gerado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.praticar_desafios_cache to anon, authenticated;
grant all on public.praticar_desafios_cache to service_role;
alter table public.praticar_desafios_cache enable row level security;
create policy "leitura publica do cache de desafios"
  on public.praticar_desafios_cache
  for select using (true);
create trigger trg_praticar_desafios_cache_updated_at
  before update on public.praticar_desafios_cache
  for each row execute function public.update_updated_at_column();

-- Progresso por usuario e artigo
create table public.praticar_progresso_artigo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  artigo_id uuid not null references public.vade_mecum_artigos(id) on delete cascade,
  lei_id uuid,
  estrelas smallint not null default 0,
  melhor_pct smallint not null default 0,
  tentativas int not null default 0,
  acertos_total int not null default 0,
  ultima_sessao_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, artigo_id)
);
grant select, insert, update, delete on public.praticar_progresso_artigo to authenticated;
grant all on public.praticar_progresso_artigo to service_role;
alter table public.praticar_progresso_artigo enable row level security;
create policy "usuario le seu progresso praticar"
  on public.praticar_progresso_artigo
  for select using (auth.uid() = user_id);
create policy "usuario insere seu progresso praticar"
  on public.praticar_progresso_artigo
  for insert with check (auth.uid() = user_id);
create policy "usuario atualiza seu progresso praticar"
  on public.praticar_progresso_artigo
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usuario apaga seu progresso praticar"
  on public.praticar_progresso_artigo
  for delete using (auth.uid() = user_id);
create trigger trg_praticar_progresso_artigo_updated_at
  before update on public.praticar_progresso_artigo
  for each row execute function public.update_updated_at_column();
create index idx_praticar_progresso_user_lei on public.praticar_progresso_artigo(user_id, lei_id);
