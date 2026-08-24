
-- 1. Bloquear usuários
alter table public.horus_whatsapp_users add column if not exists blocked boolean not null default false;

-- 2. Funções do Horus
create table if not exists public.horus_funcoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  prompt text not null,
  icone text,
  keywords text[] not null default '{}',
  ativo boolean not null default true,
  apenas_premium boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.horus_funcoes to authenticated;
grant all on public.horus_funcoes to service_role;
alter table public.horus_funcoes enable row level security;

create policy "Admins gerenciam funcoes do Horus"
on public.horus_funcoes for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

create trigger trg_horus_funcoes_updated_at
before update on public.horus_funcoes
for each row execute function public.update_updated_at_column();

-- 3. Campanhas de marketing
create table if not exists public.horus_campaigns (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  media_url text,
  publico_alvo text not null default 'all',
  filtro jsonb,
  agendada_para timestamptz,
  status text not null default 'rascunho',
  total_alvo int not null default 0,
  total_enviado int not null default 0,
  total_falha int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.horus_campaigns to authenticated;
grant all on public.horus_campaigns to service_role;
alter table public.horus_campaigns enable row level security;

create policy "Admins gerenciam campanhas do Horus"
on public.horus_campaigns for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

create trigger trg_horus_campaigns_updated_at
before update on public.horus_campaigns
for each row execute function public.update_updated_at_column();

-- 4. Destinatários de campanha
create table if not exists public.horus_campaign_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.horus_campaigns(id) on delete cascade,
  phone text not null,
  nome text,
  status text not null default 'pendente',
  enviado_em timestamptz,
  erro text,
  created_at timestamptz not null default now()
);

create index if not exists idx_horus_campaign_targets_campaign on public.horus_campaign_targets(campaign_id);
create index if not exists idx_horus_campaign_targets_status on public.horus_campaign_targets(status);

grant select, insert, update, delete on public.horus_campaign_targets to authenticated;
grant all on public.horus_campaign_targets to service_role;
alter table public.horus_campaign_targets enable row level security;

create policy "Admins gerenciam destinatarios de campanhas"
on public.horus_campaign_targets for all
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

-- 5. Enriquecer outbound log
alter table public.horus_outbound_log add column if not exists campaign_id uuid references public.horus_campaigns(id) on delete set null;
alter table public.horus_outbound_log add column if not exists tipo text not null default 'resposta_ai';

create index if not exists idx_horus_outbound_log_campaign on public.horus_outbound_log(campaign_id);
create index if not exists idx_horus_outbound_log_tipo on public.horus_outbound_log(tipo);

-- 6. Seed inicial das funções
insert into public.horus_funcoes (nome, descricao, prompt, icone, keywords, ordem) values
('Resumir lei ou artigo', 'Resume leis e artigos jurídicos a partir de link ou número.', 'Você é um jurista. Resuma a lei/artigo mencionado em até 5 tópicos claros, destacando o que muda na prática.', 'FileText', array['resumir','resumo','lei','artigo'], 1),
('Explicar termo jurídico', 'Explica termos e conceitos jurídicos de forma didática.', 'Explique o termo jurídico solicitado em linguagem simples, com um exemplo prático curto.', 'BookOpen', array['explicar','o que é','significa','conceito'], 2),
('Consulta Vade Mecum', 'Busca artigos no Vade Mecum e devolve o texto integral.', 'Localize o artigo pedido no Vade Mecum e responda com o texto integral e uma breve explicação.', 'Scale', array['vade mecum','código','cf','cpc','cpp','clt'], 3),
('Radar do dia', 'Envia as últimas leis e atos publicados hoje.', 'Liste as leis publicadas hoje com título, tipo e link, no formato de tópicos curtos.', 'Radar', array['radar','hoje','novidades','publicações'], 4),
('Criar lembrete', 'Cria um lembrete pessoal a partir da fala do usuário.', 'Extraia data, hora e assunto do lembrete solicitado e confirme com o usuário antes de salvar.', 'Bell', array['lembrar','lembrete','agendar','marcar'], 5),
('Modo estudo', 'Gera 3 questões objetivas sobre um tema jurídico.', 'Gere 3 questões objetivas (A-D) sobre o tema pedido, com gabarito comentado ao final.', 'GraduationCap', array['estudar','questão','simulado','prova'], 6),
('Resumo de mídia', 'Resume PDFs, áudios ou imagens enviados no chat.', 'Você recebeu uma mídia. Resuma o conteúdo em tópicos e destaque pontos jurídicos relevantes.', 'FileAudio', array[]::text[], 7)
on conflict do nothing;
