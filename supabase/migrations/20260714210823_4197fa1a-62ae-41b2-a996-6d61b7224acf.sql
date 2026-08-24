-- 1) agenda_eventos
CREATE TABLE public.agenda_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'tarefa', -- prova, tarefa, aviso, estudo
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz,
  checklist jsonb DEFAULT '[]'::jsonb, -- [{texto, feito}]
  cor text,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agenda_eventos_user_data ON public.agenda_eventos(user_id, data_inicio DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_eventos TO authenticated;
GRANT ALL ON public.agenda_eventos TO service_role;
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agenda_eventos" ON public.agenda_eventos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agenda_eventos_updated BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) kanban_cards (pessoal, separado do kanban_proposicoes legislativo)
CREATE TABLE public.kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  coluna text NOT NULL DEFAULT 'todo', -- todo, doing, done
  prioridade text NOT NULL DEFAULT 'media', -- baixa, media, alta
  ordem integer NOT NULL DEFAULT 0,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kanban_cards_user_col ON public.kanban_cards(user_id, coluna, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_cards TO authenticated;
GRANT ALL ON public.kanban_cards TO service_role;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kanban_cards" ON public.kanban_cards FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_kanban_cards_updated BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) avisos
CREATE TABLE public.avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  avisar_em timestamptz NOT NULL,
  recorrencia text DEFAULT 'unica', -- unica, diaria, semanal, mensal
  ativo boolean NOT NULL DEFAULT true,
  disparado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_avisos_user_data ON public.avisos(user_id, avisar_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own avisos" ON public.avisos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_avisos_updated BEFORE UPDATE ON public.avisos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();